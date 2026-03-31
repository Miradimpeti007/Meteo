import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { startPoller } from './poller.js';
import dataRouter from './routes/data.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', dataRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

async function main() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
    startPoller();
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

main();
