import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/orders',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(res.statusCode, data));
});

req.write(JSON.stringify({
  productId: '4bb8bd9b-c4d3-485e-ae1f-cf9ab5fecb50', // Need a valid ID, let me fetch one first
  payType: 'superpay_alipay',
  buyerName: '',
  buyerPhone: ''
}));
req.end();
