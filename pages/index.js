import fs from 'node:fs';
import path from 'node:path';

export default function Home() { return null; }

export async function getServerSideProps({ res }) {
  const file = path.join(process.cwd(), 'index.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
  return { props: {} };
}
