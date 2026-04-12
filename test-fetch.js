async function run() {
  const formData = new FormData();
  formData.append('test', '123');

  const headers = new Headers({});
  
  const req = new Request('http://localhost:5000/api/upload/image', {
    method: 'POST',
    headers,
    body: formData
  });

  console.log('Headers:', Object.fromEntries(req.headers.entries()));
}
run();
