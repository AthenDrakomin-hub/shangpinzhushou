import http from 'http';
http.get('http://localhost:8000/api/payment-channels', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
