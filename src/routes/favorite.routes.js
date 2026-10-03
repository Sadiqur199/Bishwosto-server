import { Router } from 'express';
import { listFavorites, addFavorite, removeFavorite } from '../controllers/favorite.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

router.use(authenticate, requireDb, loadUser);
router.get('/', listFavorites);
router.post('/:workerId', addFavorite);
router.delete('/:workerId', removeFavorite);

export default router;
