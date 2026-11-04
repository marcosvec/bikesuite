import importlib.util
import json
import html
import unittest
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('catalogs', Path(__file__).parents[1] / 'scripts/refresh-catalogs.py')
catalogs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalogs)
def page(code, next_url=None):
    data = dict(code=code, name='Test bike', url='/bikes/road-bikes/test/p/'+code+'/', price=dict(value=100, currencyIso='USD'))
    result = '<product-card-item :product="'+html.escape(json.dumps(data), quote=True)+'"></product-card-item>'
    if next_url: result += '<a rel="next" href="'+html.escape(next_url, quote=True)+'">Next</a>'
    return result
class CollectorTests(unittest.TestCase):
    def test_trek_pagination(self):
        with patch.object(catalogs, 'fetch', side_effect=[page('1','/bikes/c/B100/?page=1'),page('2')]) as fetch:
            products, coverage = catalogs.trek()
        self.assertEqual(len(products), 2)
        self.assertTrue(coverage['paginationComplete'])
        self.assertEqual(fetch.call_args_list[1].args[0], 'https://www.trekbikes.com/us/en_US/bikes/c/B100/?page=1')
    def test_trek_repeated_page_fails(self):
        with patch.object(catalogs, 'fetch', side_effect=[page('1','/bikes/c/B100/?page=1'),page('1')]):
            with self.assertRaisesRegex(RuntimeError, 'no new'): catalogs.trek()
    def test_trek_cross_host_pagination_fails(self):
        with patch.object(catalogs, 'fetch', return_value=page('1','https://elsewhere.example/')):
            with self.assertRaisesRegex(RuntimeError, 'host'): catalogs.trek()
    def test_empty_giant_category_fails(self):
        with patch.object(catalogs, 'fetch', return_value='<html>No products</html>'):
            with self.assertRaisesRegex(RuntimeError, 'No families'): catalogs.giant()
    def test_http_failure_is_not_silently_partial(self):
        with patch.object(catalogs, 'fetch', side_effect=RuntimeError('429 rate limit')):
            with self.assertRaisesRegex(RuntimeError, '429'): catalogs.trek()
if __name__ == '__main__': unittest.main()
