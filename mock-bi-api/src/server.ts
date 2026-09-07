import express from 'express';
import cookieParser from 'cookie-parser';
import { mockConfig } from './env';
import { authorize, requireBearer, signin, token } from './auth';
import { handleBi } from './bi';
import { resetDefinitions, resetSnapshots } from './store';

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
});

app.get('/', (_req, res) => {
  res.json({
    name: 'simphony-bi-mock-api',
    port: mockConfig.port,
    org: mockConfig.org,
    docs: {
      authorize: 'GET /oidc-provider/v1/oauth2/authorize',
      signin: 'POST /oidc-provider/v1/oauth2/signin',
      token: 'POST /oidc-provider/v1/oauth2/token',
      bi: 'POST /bi/v1/:org/:operation',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/oidc-provider/v1/oauth2/authorize', (req, res) => {
  authorize(req, res).catch((err) => {
    res.status(500).json({ error: String(err.message || err) });
  });
});

app.post('/oidc-provider/v1/oauth2/signin', (req, res) => {
  signin(req, res).catch((err) => {
    res.status(500).json({ error: String(err.message || err) });
  });
});

app.post('/oidc-provider/v1/oauth2/token', (req, res) => {
  token(req, res).catch((err) => {
    res.status(500).json({ error: String(err.message || err) });
  });
});

app.options('/bi/v1/:org/:operation', (_req, res) => {
  res.status(204).end();
});

app.post('/bi/v1/:org/:operation', requireBearer, (req, res) => {
  handleBi(req, res).catch((err) => {
    res.status(500).json({ error: String(err.message || err) });
  });
});

function localOnly(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    next();
    return;
  }
  res.status(403).json({ error: 'local_only' });
}

app.post('/admin/reset', localOnly, async (_req, res) => {
  await resetSnapshots();
  res.json({ ok: true, cleared: 'totals snapshots only' });
});

app.post('/admin/reset-definitions', localOnly, async (_req, res) => {
  await resetDefinitions();
  res.json({ ok: true, cleared: 'definitions and totals snapshots' });
});

app.listen(mockConfig.port, () => {
  console.log(`Mock Simphony BI host listening on http://localhost:${mockConfig.port}`);
});
