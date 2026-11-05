export const source = `diagram "Checkout" version=1
node web "Web app" color=blue
node api "API"
node db "Orders" color=teal
edge request web -> api "request"
edge query api -> db "query"
`;
