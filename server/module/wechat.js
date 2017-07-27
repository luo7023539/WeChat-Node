'use strict'

const crypto = require('crypto'), //引入加密模块
      https = require('https'),
      util = require('util'),
      urltil = require('url'),
      fs = require('fs'),
      msg = require('./msg'),
      localAccessToken = require('../access_token'),
      menus = require('../menus'),
      parseString = require('xml2js').parseString;

let sendHttps = function(url){
    console.log('Send Https', url);
    return new Promise(function(resolve, reject){
        https
            .get(url, function (res) {
                let result = '';
                //监听 data 事件
                res.on('data', function(data){
                    result += data;
                });
                //监听 数据传输完成事件
                res.on('end', function(){
                    result = result.toString('utf8');
                    //将最后结果返回
                    console.log('Data End', result)
                    resolve(result);
                });
            })
            .on('error',function(err){
                reject(err);
            });
    });
};

let requestPost = function(url,data){
    return new Promise(function(resolve,reject){
        //解析 url 地址
        var urlData = urltil.parse(url);
        //设置 https.request  options 传入的参数对象
        var options={
            //目标主机地址
            hostname: urlData.hostname,
            //目标地址
            path: urlData.path,
            //请求方法
            method: 'POST',
            //头部协议
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data,'utf-8')
            }
        };
        var req = https.request(options,function(res){
            var buffer = [],result = '';
            //用于监听 data 事件 接收数据
            res.on('data',function(data){
                buffer.push(data);
            });
            //用于监听 end 事件 完成数据的接收
            res.on('end',function(){
                result = Buffer.concat(buffer).toString('utf-8');
                resolve(result);
            })
        })
        //监听错误事件
            .on('error',function(err){
                console.log(err);
                reject(err);
            });
        //传入数据
        req.write(data);
        req.end();
    });
}


class WeChat {
    constructor (config){
        this.config = config;
        //设置 WeChat 对象属性 token
        this.token = config.token;
        //设置 WeChat 对象属性 AppID
        this.AppID = config.AppID;
        //设置 WeChat 对象属性 AppScrect
        this.AppScrect = config.AppScrect;
        //设置 WeChat 对象属性 apiDomain
        this.apiDomain = config.apiDomain;
        //设置 WeChat 对象属性 apiURL
        this.apiURL = config.apiURL;

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
                url = util.format(that.apiURL.accessTokenApi,
                                  that.apiDomain,
                                  that.AppID,
                                  that.AppScrect);

            //判断 本地存储的 access_token 是否有效
            if(localAccessToken.access_token === "" ||
                localAccessToken.expires_time < currentTime){
                console.log('Access_token local error');
                sendHttps(url)
                    .then(function(data){
                    let result = JSON.parse(data);

                    if(data.indexOf("errcode") < 0){
                        localAccessToken.access_token = result.access_token;
                        localAccessToken.expires_time = new Date().getTime() +
                            (parseInt(result.expires_in) - 200) * 1e3;
                        //更新本地存储的
                        fs.writeFile('../access_token.json', JSON.stringify(localAccessToken),
                            function (err) {
                                if(err){
                                    console.log('Write File Error', err)
                                }else{
                                    console.log('Write File Success')
                                }
                            }
                        );
                        //将获取后的 access_token 返回
                        resolve(localAccessToken.access_token);
                    }else{
                        //将错误返回
                        resolve(result);
                    }
                });
            }else{
                //将本地存储的 access_token 返回
                console.log('Access_token local useful');
                resolve(localAccessToken.access_token);
            }
        });
    }

    /**
     *
     */
    createMenu (data) {
        //格式化请求连接
        var url = util.format(this.apiURL.createMenu, this.apiDomain, data);
        //使用 Post 请求创建微信菜单
        requestPost(url, JSON.stringify(menus))
            .then(function (data) {
                console.log(data)
            })
    }

    handleMsg (req,res){
        var buffer = [];
        //监听 data 事件 用于接收数据
        req.on('data',function(data){
            buffer.push(data);
        });
        //监听 end 事件 用于处理接收完成的数据
        req.on('end',function(){
            var msgXml = Buffer.concat(buffer).toString('utf-8');
            //解析xml
            parseString(msgXml,{explicitArray : false},function(err,result){
                if(!err){
                    result = result.xml;
                    var toUser = result.ToUserName; //接收方微信
                    var fromUser = result.FromUserName;//发送仿微信
                    //判断事件类型
                    console.log(result)
                    if(result.Event){
                        switch (result.Event){
                            case 'subscribe':
                                var content = "欢迎关注 罗椋 公众号，一起斗图吧。回复以下数字：\n";
                                content += "1.你是谁\n";
                                content += "2.关于Node.js\n";
                                content += "回复 “文章”  可以得到图文推送哦~\n";
                                res.send(msg.txtMsg(fromUser, toUser, content));
                                break;
                            case 'unsubscribe':
                                res.send(msg.txtMsg(fromUser, toUser, '别走嘛!!'));
                                break;
                        }
                    }else{
                        switch (result.Content){
                            case '1':
                                res.send(msg.txtMsg(fromUser,toUser,'Hello ！我是罗椋'));
                                break;
                            case '2':
                                res.send(msg.txtMsg(fromUser,toUser,'Node.js是一个开放源代码、跨平台的JavaScript语言运行环境，采用Google开发的V8运行代码,使用事件驱动、非阻塞和异步输入输出模型等技术来提高性能，可优化应用程序的传输量和规模。这些技术通常用于数据密集的事实应用程序'));
                                break;
                            case '文章':
                                var contentArr = [
                                    {Title:"Node.js 微信自定义菜单",Description:"使用Node.js实现自定义微信菜单",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72868520"},
                                    {Title:"Node.js access_token的获取、存储及更新",Description:"Node.js access_token的获取、存储及更新",PicUrl:"http://img.blog.csdn.net/20170528151333883?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72783631"},
                                    {Title:"Node.js 接入微信公众平台开发",Description:"Node.js 接入微信公众平台开发",PicUrl:"http://img.blog.csdn.net/20170605162832842?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvaHZrQ29kZXI=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast",Url:"http://blog.csdn.net/hvkcoder/article/details/72765279"}
                                ];
                                //回复图文消息
                                res.send(msg.graphicMsg(fromUser,toUser,contentArr));
                        }
                    }
                }else{
                    //打印错误信息
                    console.log(err);
                }
            })
        });
    }

}

module.exports = WeChat;