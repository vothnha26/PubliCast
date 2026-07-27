const express = require('express');
const brandController = require('../../controllers/workspace/brand.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyAuth, brandController.getBrands);
router.post('/', verifyAuth, brandController.createBrand);
router.put('/:id', verifyAuth, brandController.updateBrand);
router.delete('/:id', verifyAuth, brandController.deleteBrand);

module.exports = router;
