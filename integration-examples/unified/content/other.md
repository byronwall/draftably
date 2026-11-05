# Checkout

```draft {alt="Checkout request path." caption="Checkout request path"}
diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Postgres" shape=pill
edge request web -> api "HTTPS"
edge persist api -> db "store order"
```

```draft {src="./diagrams/included.draft" alt="The API stores an order."}

```

> A nested diagram stays nested in the AST.
>
> ```draft {alt="Nested API path."}
> diagram "Nested" version=1
> node api "API"
> ```

- This diagram is nested in a list.

  ```draft {alt="A list API path."}
  diagram "Listed API" version=1
  node web "Web app"
  node api "API"
  edge request web -> api "HTTPS"
  ```

````markdown
```draft {alt="This is a literal example."}
not rendered by the plugin
```
````
