import { Router } from 'express';
import {
  handleMcpPost,
  handleSessionRequest,
} from '../controllers/mcp.controller';

const router = Router();

router.post('/', handleMcpPost);
router.get('/', handleSessionRequest);
router.delete('/', handleSessionRequest);

export default router;
