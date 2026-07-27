const express = require('express');
const searchController = require('../../controllers/core/search.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Universal search endpoint, requires auth
router.get('/', verifyAuth, searchController.searchAll);

module.exports = router;
