# replace this
## TODO: Add concise README

### DOD
Create an AppSync app which allows querying customers orders from DynamoDB. Only read-queries, the task does not imply implementation of mutations which change the data.

### Create AWS CDK app
Use a projen template
### Provision DynamoDB
Store some seed data of the following hierarchy
Customer (email, full name) – o2m → Order (id, date, total amount, products quantity) – m2m → Product (name, price)
Provision AppSync app with a query of the following signature:

```javascript
  query {
    orders {
      id
      date
      totalAmount

      customer {
        email
        fullName
      }
      
      products {
        price
        quantity
      }
    }
  }
```
