var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/profile', function(req, res, next) {
  res.send('profile', { title: 'OIDC APP' });
});

module.exports = router;
