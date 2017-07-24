'use strict'

const crypto = require('crypto'), //引入加密模块
      https = require('https'),
      util = require('util'),
      fs = require('fs');

let sendHttps = function(url){
    return new Promise(function(resolve, reject){
        https
            .get(url, function (res) {
                let buffer = [],
                    result = '';
                //监听 data 事件
                res.on('data', function(data){
                    buffer.push(data);
                });
                //监听 数据传输完成事件
                res.on('end', function(){
                    result = Buffer.concat(buffer, buffer.length).toString('utf-8');
                    //将最后结果返回
                    resolve(result);
                });
            })
            .on('error',function(err){
                reject(err);
            });
    });
};


class WeChat {
    constructor (config){
        //设置 WeChat 对象属性 token
        this.token = config.token;
        //设置 WeChat 对象属性 AppID
        this.AppID = config.AppID;
        //设置 WeChat 对象属性 AppScrect
        this.AppScrect = config.AppScrect;
        //设置 WeChat 对象属性 apiDomain
        this.apiDomain = config.apiDomain;
        //设置 WeChat 对象属性 apiURL
        this.apiDomain = config.apiURL;
    }

    /**
     * Test http request from
     * @param req
     * @param res
     */
    auth (req, res){
        //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
        let signature = req.query.signature,//微信加密签名
            timestamp = req.query.timestamp,//时间戳
            nonce = req.query.nonce,//随机数
            echostr = req.query.echostr;//随机字符串

        //2.将token、timestamp、nonce三个参数进行字典序排序
        let array = [this.token,timestamp,nonce].sort(),

        //3.将三个参数字符串拼接成一个字符串进行sha1加密
            tempStr = array.join(''),
            hashCode = crypto.createHash('sha1'), //创建加密类型
            resultCode = hashCode.update(tempStr,'utf8').digest('hex'); //对传入的字符串进行加密

        //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
        if(resultCode === signature){
            res.send(echostr);
        }else{
            res.send('<h1>Mis match</h1>');
        }
    }

    /**
     * send Https request to get AccessToken
     * @returns {Promise}
     */

    getAccessToken (){
        var that = this;
        return new Promise(function(resolve, reject){
            //获取当前时间
            let currentTime = new Date().getTime(),
            //格式化请求地址
                url = util.format(that.apiURL.accessTokenApi,that.apiDomain,that.AppID,that.AppScrect);
            //判断 本地存储的 access_token 是否有效
            if(accessTokenJson.access_token === "" ||
                accessTokenJson.expires_time < currentTime){
                sendHttps(url)
                    .then(function(data){
                    let result = JSON.parse(data);

                    if(data.indexOf("errcode") < 0){
                        accessTokenJson.access_token = result.access_token;
                        accessTokenJson.expires_time = new Date().getTime() +
                            (parseInt(result.expires_in) - 200) * 1e3;
                        //更新本地存储的
                        fs.writeFile('./wechat/access_token.json',JSON.stringify(accessTokenJson));
                        //将获取后的 access_token 返回
                        resolve(accessTokenJson.access_token);
                    }else{
                        //将错误返回
                        resolve(result);
                    }
                });
            }else{
                //将本地存储的 access_token 返回
                resolve(accessTokenJson.access_token);
            }
        });
    }

}

module.exports = WeChat;