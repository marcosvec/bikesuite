"""Collect public US bicycle listings into static catalog snapshots.
Run: python scripts/refresh-catalogs.py [trek|giant]
Catalogs are reference data, never shop stock. No account or dealer prices are accessed.
"""
import json, re, subprocess, tempfile, time, sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parents[1]
STAMP = datetime.now(timezone.utc).isoformat()
class Tags(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.tags=[]; self.feed(text)
 def handle_starttag(self,tag,attrs): self.tags.append((tag,dict(attrs)))
def fetch(url):
 with tempfile.TemporaryDirectory() as tmp:
  file=Path(tmp)/'response.html'
  r=subprocess.run(['powershell.exe','-NoProfile','-File',str(ROOT/'scripts/catalog-fetch.ps1'),url,str(file)],capture_output=True,text=True)
  if r.returncode: raise RuntimeError(r.stderr.strip()[:400])
  time.sleep(1)
  return file.read_text(encoding='utf-8-sig')
def record(brand,key,name,url,category,price=None,kind='model',year=None):
 return dict(id=brand+':'+str(key),manufacturer=brand,name=name,productType='Bikes',category=category,year=year,price=price,currency='USD',priceKind='Listed price' if kind=='model' else 'Family starting price',sourceUrl=url,collectedAt=STAMP,recordType=kind,specifications={})
def trek():
 url='https://www.trekbikes.com/us/en_US/bikes/c/B100/'
 rows={}; seen=set(); pages=0; complete=False
 while url and pages<100:
  if url in seen: raise RuntimeError('Pagination repeated; refusing to mark complete')
  seen.add(url); tags=Tags(fetch(url)).tags; pages+=1; before=len(rows)
  for tag,a in tags:
   if tag!='product-card-item' or ':product' not in a: continue
   p=json.loads(a[':product']); path=p['url']; parts=path.strip('/').split('/')
   category=parts[1].replace('-',' ').title() if len(parts)>1 else 'Other'
   price=p.get('price') or {}; amount=price.get('value') if price.get('currencyIso')=='USD' else None
   rows[p['code']]=record('trek',p['code'],p['name'],'https://www.trekbikes.com/us/en_US'+path,category,amount)
  if len(rows)==before: raise RuntimeError('Page yielded no new products')
  next_link=next((a.get('href') for t,a in tags if t=='a' and a.get('rel')=='next'),None)
  if not next_link: complete=True; break
  if next_link.startswith('/bikes/'): next_link='/us/en_US'+next_link
  url=urljoin(url,next_link)
  if urlparse(url).netloc!='www.trekbikes.com': raise RuntimeError('Unexpected pagination host')
  print('Trek',pages,len(rows),flush=True)
 if not complete: raise RuntimeError('Pagination limit reached; refusing to publish an incomplete listing')
 return list(rows.values()), dict(scope='Public US Bikes listing; models and framesets, not historical archives or all equipment.',paginationComplete=complete,pages=pages)
def giant():
 rows={}; categories=['road-bikes','mountain-bikes','cross-and-gravel-bikes','fitness-and-city-bikes','e-bikes','kids-bikes']
 for category in categories:
  tags=Tags(fetch('https://www.giant-bicycles.com/us/bikes/'+category)).tags
  extracted=0
  for tag,a in tags:
   if tag!='a' or not a.get('data-product-name') or not a.get('data-ga4_items'): continue
   values=json.loads(a['data-ga4_items'])
   if not values: continue
   v=values[0]; key=v.get('item_id'); url=urljoin('https://www.giant-bicycles.com',a.get('href',''))
   if not key or not url.startswith('https://www.giant-bicycles.com/us/'): continue
   year_match=re.search(r'-(20\d{2})(?:$|[?#])',url)
   item=record('giant',key,a['data-product-name'],url,str(v.get('item_category2') or category).replace('-',' ').title(),v.get('price') or None,'family',int(year_match[1]) if year_match else None)
   rows[key]=item; extracted+=1
  if not extracted: raise RuntimeError('No families extracted from '+category)
  print('Giant',category,len(rows),flush=True)
 return list(rows.values()), dict(scope='Public US bicycle family listings across six categories. Family prices are not individual build prices; model variants, specifications, and historical archives are not yet collected.',paginationComplete=False,pages=6)
if __name__=='__main__':
 for name in sys.argv[1:] or ['trek','giant']:
  if name not in ('trek','giant'): raise SystemExit('Supported collectors: trek, giant')
  try:
   rows,coverage=globals()[name]()
   if not rows: raise RuntimeError('No records extracted')
   output=ROOT/'public/catalogs'/f'{name}.json'; output.parent.mkdir(parents=True,exist_ok=True)
   tmp=output.with_suffix('.tmp')
   tmp.write_text(json.dumps(dict(manufacturer=name,collectedAt=STAMP,coverage=coverage,products=rows),ensure_ascii=False,indent=2),encoding='utf-8'); tmp.replace(output)
   print(name,len(rows),'saved',flush=True)
  except Exception as e: print(name,'FAILED; previous snapshot retained:',e,flush=True); sys.exit(1)
