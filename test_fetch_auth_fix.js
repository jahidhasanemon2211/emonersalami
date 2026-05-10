async function run() {
  const response = await fetch('http://127.0.0.1:3000/api/movies/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Fix', genre: 'action', quality: '1080p', description: 'Test auth fix' })
  });
  console.log("Status:", response.status);
  const json = await response.json();
  console.log("Response JSON:", json);
}
run().catch(console.error);
