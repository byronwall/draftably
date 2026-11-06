# Markdown Action fixture

CI runs [`actions/render-markdown`](../../actions/render-markdown) on this folder. Each `draft`
fence below gets an SVG beside this file and an image link under the fence. The committed files
have no links, so the job sees a first run and then a rerun.

```draft
diagram "Request path"
node web "Web app"
node api "API"
node db "Orders" shape=pill
edge e1 web -> api "HTTPS"
edge e2 api -> db
```

A fence with options names its image and sets the alt text:

```draft {id="checkout-flow" alt="Cart, payment, then receipt."}
node cart "Cart"
node pay "Payment"
node receipt "Receipt"
edge e1 cart -> pay
edge e2 pay -> receipt
```
