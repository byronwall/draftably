```draft {mode="interactive" alt="A web app calls the API." caption="Interactive API path"}
# PRIVATE_SOURCE_SENTINEL
diagram "Web to API" version=1
node web "Web app"
node api "API"
edge request web -> api "HTTPS"
```

```draft {mode="interactive" alt="The API stores an order." caption="Order storage" state="stored"}
diagram "Order storage" version=1
node api "API"
node db "Orders"
edge persist api -> db "save"
state stored "Stored" api db rest=plain
```
