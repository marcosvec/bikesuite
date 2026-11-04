import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPromisedPickup } from '@/lib/demo/create-work-order'
import type { ServiceReceipt } from '@/lib/demo/work-order-service'

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export function ServiceReceiptView({
  receipt,
  onDone,
}: {
  receipt: ServiceReceipt
  onDone: () => void
}) {
  const when = formatPromisedPickup(receipt.promisedPickup)
  const paid = new Date(receipt.createdAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="space-y-4">
      <article id="service-receipt" className="space-y-3 text-sm print:bg-white print:text-black">
        <header>
          <h2 className="text-lg font-semibold">BikeSuite</h2>
          <p className="text-xs text-muted-foreground print:text-black">Demo receipt — no payment was captured</p>
        </header>
        <p>
          <span className="font-medium">{receipt.workOrderNumber}</span>
          <span className="text-muted-foreground print:text-black"> · {receipt.transactionNumber}</span>
        </p>
        <p>{receipt.customerName}</p>
        <p className="text-muted-foreground print:text-black">{paid}</p>
        {when && <p>Promised pickup {when}</p>}
        <table className="w-full text-left">
          <caption className="sr-only">Charges for {receipt.workOrderNumber}</caption>
          <thead>
            <tr className="text-xs text-muted-foreground print:text-black">
              <th scope="col" className="py-1 font-medium">Item</th>
              <th scope="col" className="py-1 text-right font-medium">Qty</th>
              <th scope="col" className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map(line => (
              <tr key={`${line.type}-${line.name}`}>
                <th scope="row" className="py-1 pr-2 font-normal">{line.name}</th>
                <td className="py-1 text-right tabular-nums">{line.quantity}</td>
                <td className="py-1 text-right tabular-nums">{money(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Separator />
        <div className="space-y-1">
          <p className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(receipt.subtotal)}</span></p>
          <p className="flex justify-between"><span>Tax ({(receipt.taxRate * 100).toFixed(0)}%)</span><span className="tabular-nums">{money(receipt.tax)}</span></p>
          <p className="flex justify-between text-base font-semibold"><span>Total</span><span className="tabular-nums">{money(receipt.total)}</span></p>
          <p className="pt-1 capitalize">Recorded as {receipt.method}</p>
        </div>
      </article>
      <div className="flex justify-end gap-2 print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()}>Print receipt</Button>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}
