# Windows Azure Account Table Scripts

## INSERT

```javascript
function insert(item, user, request) {
    item.owner = user.userId;
    request.execute();
}
```

## UPDATE

```javascript
function update(item, user, request) {
    if (item.owner == user.userId) {
        request.execute();
    }
}
```

## DELETE

```javascript
function del(id, user, request) {
    var accountTable = tables.getTable('Account');
    accountTable.where({
        id: id,
        owner: user.userId
    }).read({
        success: function(account){
            request.execute();
        }
    });
}
```

## READ

```javascript
function read(query, user, request) {
    query.where({
        owner: user.userId
    });
    request.execute();

}
```