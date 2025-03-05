fetch('http://localhost:3000/api/contributions', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidXNlclRlc3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0MDUwMjU0OSwiZXhwIjoxNzQxMjIyNTQ5fQ.wOOGp2frri2NDVxuHzXYFxh1bkN2CYBTUrOj4QUrV4k'  // Remplacez par votre token généré
    }
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
  



curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidXNlclRlc3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0MDQ4ODY3MywiZXhwIjoxNzQwNDkyMjczfQ.d8M14JZF2iLd4AH4_3qU0jzLARK2e9Crv8oSi-uFnjU" http://localhost:3000/api/protected
