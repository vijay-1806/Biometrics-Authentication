const http = require('http');

http.get('http://127.0.0.1:8000/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    console.log('Page Title / Content Snippet:', data.substring(0, 300));
  });
}).on('error', (err) => {
  console.error('Error connecting to http://127.0.0.1:8000:', err.message);
});
