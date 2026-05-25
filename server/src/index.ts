import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './database';
import listsRouter from './routes/lists';
import processRouter from './routes/process';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/lists', listsRouter);
app.use('/api/process', processRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function main() {
  await getDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
