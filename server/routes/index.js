let express = require('express'), //express 框架
    router  = express.Router(),
    crypto  = require('crypto'), //引入加密模块
    WeChat  = require('../module/wechat'),
    config  = require('../config.json');//引入配置文件

let we = new WeChat(config);

router.all('/auth', function(req, res){
  we
      .auth(req, res)
});

router.get('/getAccessToken',function(req, res){
  we
      .getAccessToken()
      .then(function(data){
        res.send(data);
      });
});

module.exports = router;



