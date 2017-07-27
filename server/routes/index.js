let express = require('express'), //express 框架
    router  = express.Router(),
    crypto  = require('crypto'), //引入加密模块
    WeChat  = require('../module/wechat'),
    config  = require('../config'), //引入配置文件
    logger = require('morgan');


let we = new WeChat(config);

router.get('/', function(req, res){
  we
      .auth(req, res)
});

router.post('/',function(req,res){
    we.handleMsg(req,res);
});

router.get('/getAccessToken',function(req, res){
  we
      .getAccessToken()
      .then(function(data){
          res.send(data);
          we.createMenu(data)
      });
});


module.exports = router;



