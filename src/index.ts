import express from 'express';
import morgan from 'morgan';
import mcpRoutes from './routes/mcp.routes';
import { PORT } from './config';
import packageJson from '../package.json';

console.log(`MCP Client Evals Server v${packageJson.version}`);

const app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */);
app.use(express.json());
app.use(morgan('dev'));

app.use('/mcp', mcpRoutes);

app.get('/', (req, res) => {
  const statusToSend = 200;

  res.status(statusToSend).send('OK');
});

app.listen(PORT, () => {
  const port = `MCP Client Evals (HTTP Stateful) listening on port ${PORT}`;
  const rootEndpoint = `Root MCP endpoint available at /mcp (POST, GET, DELETE)`;

  console.log(`${port}\n${rootEndpoint}`);
});
