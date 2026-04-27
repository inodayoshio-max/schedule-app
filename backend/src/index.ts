import express from 'express';
import path from 'path';
import eventsRouter from './routes/events';
import answersRouter from './routes/answers';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/answers', answersRouter);

const staticDir = path.join(__dirname, '../../frontend/dist');
app.use(express.static(staticDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`App running on http://0.0.0.0:${PORT}`);
});
