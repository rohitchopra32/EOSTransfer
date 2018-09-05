import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import Eos from "eosjs";
import request from "request";
import axios from "axios";
import Web3 from "web3";
import { basePath, thirdPath } from "./utils/constant";
import { CLIENT_RENEG_WINDOW } from "tls";
const createKeccakHash = require('keccak')
const util = require("ethereumjs-util");

// import hashlib from '../node_modules/hashlib';
// var sha256 = require('js-sha256').sha256;
var crypto = require("crypto");
// var sha256 = require("crypto-js/sha256");

var scatter = {};
var pubkey = "EOS8KcZx26i1E4H1fxek1ug7QZWQeu4FP2j8b3wYDYWQKkqvuNL6w";
const network = {
  protocol: "http", // Defaults to https
  blockchain: "eos",
  host: "193.93.219.219",
  port: 8888,
  chainId: "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca"
};

const eosOptions = {
  chainId: "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca"
};
console.log("web 3 = ", window.web3);
// const web3 = window.web3 ? new Web3(window.web3.currentProvider) : "";

class Sign extends Component {
  constructor() {
    super();
    this.state = {
      name: "",
      publicKey: "",
      // privateKey:"",
      errorMsg: "hello",
      errorV: "hidden",
      placeholderName: "Enter Name",
      placeholderPublic: "Enter Owner public key",
      namePretty:false
      // placeholderPrivate: "Enter Owner private key"
    };
  }
  onBlurInput = async () => {
    if (this.state.name.length === 12) {
      try {
        const result = await axios({
          method: "post",
          url: `${basePath}user/nameAlreadyExist`,
          json: true,
          data: {
            name: this.state.name
          }
        });
        console.log("res = ", result);
      } catch (err) {
        console.log("err = ", err.response);
        const status = err.response.status;
        if (status === 302) {
          this.setState({
            errorMsg: err.response.statusText,
            errorV: "visible",
            namePretty:true
          });
        } else if (status === 400) {
          this.setState({
            errorMsg: err.response.data.err,
            errorV: "visible"
          });
        }
      }
    } else {
      this.setState({
        errorMsg: "Name length should be 12!",
        errorV: "visible"
      });
    }
  };
  ref_block = block_id => {
    let block_num = block_id.substring(0, 8);
    let block_prefix = block_id.substring(16, 16 + 8);

    console.log("block_num = ", block_num);
    console.log("block_prefix = ", block_prefix);

    let ref_block_num = parseInt(block_num, 16);
    let str = "";
    for (let i = 0; i < block_prefix.length; i = i + 2) {
      let mid = block_prefix.substring(i, i + 2).split("").reverse().join("");
      str += mid;
    }
    str = str.split("").reverse().join("");
    let ref_block_prefix = parseInt(str, 16);

    let obj = {
      ref_block_prefix: ref_block_prefix,
      ref_block_num: ref_block_num & 0xFFFF
    };
    return obj;
  };
  createAccount = async () => {
    const web3 = window.web3 ? new Web3(window.web3.currentProvider) : "";
    this.setState({
      errorV: "hidden"
    });
    //get account details
    const account = await web3.eth.getAccounts();
    console.log("acount", account);
    if(account.length===0){
      
      //metamask not login
      this.setState({
        errorMsg: "Please Login your MetaMask",
        errorV: "visible",
      })        
    } 
    else if (this.state.name && this.state.publicKey) {
      if (this.state.name.length !== 12) {
        this.setState({
          name: "",
          placeholderName: "Name length !== 12"
        });
      }else {
        try {

          //get info
          const getInfo = await axios({
            metthod: "GET",
            url: `${thirdPath}get_info`
          });
          console.log("blockId = ", getInfo.data);
          const result = this.ref_block(getInfo.data.last_irreversible_block_id);
          console.log("result = ", result);

          //generate msghash
          let msg = result.ref_block_num + "," + result.ref_block_prefix +","+ this.state.publicKey;
          
          console.log("msg = ", msg);
          let newMsg =  "\x19Ethereum Signed Message:\n" + msg.length + msg;
          console.log("newmsg = ", newMsg);

          let msghash = createKeccakHash('keccak256').update(newMsg).digest()
          console.log('msghash = ', msghash.toString('hex'))
          //sign to generate signature
          // let sign1  = await web3.eth.sign(msghash1,account[0]);
          let sign1  = await web3.eth.personal.sign(window.web3.toHex(msg),account[0]);
          const { v, r, s } = util.fromRpcSig(sign1);

          // console.log("sign1 = ", sign1);
          console.log("v1 = ", v.toString(16));
          console.log("s1 = ", s.toString("hex"));
          console.log("r1 = ", r.toString("hex"));
          let signature1 = `00${v.toString(16)}${r.toString("hex")}${s.toString("hex")}`;
          console.log("signature1 = ",signature1);

          //hit contract
          let obj={
              name:this.state.name,
              publicKey:this.state.publicKey,
              signature:signature1,
              ref_block_num:result.ref_block_num & 0xFFFF,
              ref_block_prefix:result.ref_block_prefix
          }
          const createAccount = await axios({
            method: "post",
            url: `${basePath}user/signWithMetaMask`,
            json: true,
            data: obj
          });
          console.log("createAccount =>", createAccount);

        } catch (err) {
          console.log("err =>", err);
        }
      }
    } else {
      this.setState({
        errorMsg: "please provide all parameters!",
        errorV: "visible"
      });
    }
  };

  handleChange = (e)=>{
    let pattern = /^[a-z1-5]*$/g;
    if(pattern.test(e.target.value)){
      this.setState({ 
        name: e.target.value,
        errorV:'hidden'
      });
    }
    else{
      console.log('invalid')
    }    
  }
  oldMethod =()=>{

    //<-----------------1------------------->
    // this.setState({
    //   errorV: "hidden"
    // });
    // if (this.state.name && this.state.publicKey) {
    //   if (this.state.name.length !== 1) {
    //     this.setState({
    //       name: "",
    //       placeholderName: "Name length !== 12"
    //     });
    //   } else {
    //     try {
    //       const account = await web3.eth.getAccounts();
    //       console.log("acount", account);
    //       if (account.length > 0) {
    //         const getInfo = await axios({
    //           metthod: "POST",
    //           url: `${thirdPath}get_info`
    //         });
    //         console.log("getInfo = ", getInfo.data.last_irreversible_block_id);
    //         console.log('ref_block = ', this.ref_block(getInfo.data.last_irreversible_block_id));
    //         // let ref_block_num = 7276721;
    //         // let ref_block_prefix = 3879712340;
    //         var hash_msg = crypto.createHash("sha256").update(new Buffer("test")).digest("binary");
    //         console.log("hash_msg", hash_msg);

    //         var msg = "test";
    //         var messageBuffer = new Buffer(msg, "hex");
    //         console.log("msg   = ", msg);

    //         // const signature = await web3.eth.accounts.sign(hash_msg,'ab8daaa4fae2dcc2869723a9df5362b701e034e5fd73ae804c01cf0b313cad75');
    //         // var signature = await web3.eth.personal.sign(msg, account[0]);
    //         // const signature = web3.eth.sign(msg,account[0]);
    //         var priv = 'ab8daaa4fae2dcc2869723a9df5362b701e034e5fd73ae804c01cf0b313cad75';
    //         console.log('hhhhhhhhh= ', encode_privkey(priv,'hex').decode('hex'))
    //         const signature = ecdsa_raw_sign(hash_msg, encode_privkey(priv,'hex').decode('hex'))

    //         console.log("sign0", signature);
    //         // console.log('v = ', v)
    //         // console.log("r=", r);
    //         // console.log("s=", s);

    //         // console.log("r=", web3.utils.hexToNumberString(signature.r));
    //         // console.log("s=", web3.utils.hexToNumberString(signature.s));

    //         //
    //         //  console.log('sign1',signature.signature)
    //         //  let hexi=web3.utils.toHex(signature.signature)
    //         //  let v=signature.v;
    //         //  let r=signature.r;
    //         //  let s=signature.s;
    //         //   console.log('sign2',hexi,v,r,s)
    //         // console.log('sign3 ',web3.utils.hexToBytes(hexi));
    //         // const obj = {
    //         //     name:this.state.name,
    //         //     publicKey:this.state.publicKey,
    //         //     signature:signature.signature
    //         // }
    //         // const createAccount = await axios({
    //         //   method: "post",
    //         //   url: `${basePath}user/signWithMetaMask`,
    //         //   json: true,
    //         //   data: obj
    //         // });
    //         // console.log("createAccount =>", createAccount);
    //       } else {
    //         console.log("please select any account in meta Mask!");
    //         this.setState({
    //           errorMsg: "please select any account in meta Mask!",
    //           errorV: "visible"
    //         });
    //       }
    //     } catch (err) {
    //       console.log("err =>", err);
    //     }
    //   }
    // } else {
    //   this.setState({
    //     errorMsg: "please provide all parameters!",
    //     errorV: "visible"
    //   });
    // }



    //<----------------2------------------->
        //get Info
    // try {
    //   const getInfo = await axios({
    //     metthod: "GET",
    //     url: `${thirdPath}get_info`
    //   });
    //   console.log("getInfo = ", getInfo.data.last_irreversible_block_id);
    //   const result = this.ref_block(getInfo.data.last_irreversible_block_id);
    //   console.log("result = ", result);
    //   // let msg = result.ref_block_num + "," + result.ref_block_prefix;
    //   let msg = "123,123"
    //   console.log("msg = ", msg);
    //   let msghash = util.sha256(msg);
    //   console.log("msghash = ", msghash);
    //   let sign = util.ecsign(msghash, util.toBuffer(this.state.privateKey));

    //   console.log("util.sha256(msg) ======", util.sha256("test"));
    //   console.log("msg = ", util.sha256(msg));
    //   console.log("sign = ", sign);
    //   console.log("v = ", sign.v.toString(16));
    //   var v = sign.v.toString(16);
    //   console.log("s = ", sign.s.toString("hex"));
    //   console.log("r = ", sign.r.toString("hex"));
    //   let signature = `00${v}${sign.r.toString("hex")}${sign.s.toString("hex")}`;
    //   console.log("signature = ",signature);
    //   let obj={
    //       name:this.state.name,
    //       publicKey:this.state.publicKey,
    //       signature:signature
    //   }
    //   const createAccount = await axios({
    //     method: "post",
    //     url: `${basePath}user/signWithMetaMask`,
    //     json: true,
    //     data: obj
    //   });
    //   console.log("createAccount =>", createAccount);
      
    // } catch (err) {
    //   console.log("err ", err);
    // }



    //<-------------------- 3 ------------------->
    // let privateKey = "0xab8daaa4fae2dcc2869723a9df5362b701e034e5fd73ae804c01cf0b313cad75";
    // this.setState({
    //   errorV: "hidden"
    // });
    // if (this.state.name && this.state.publicKey && this.state.privateKey) {
    //   if (this.state.name.length !== 12) {
    //     this.setState({
    //       name: "",
    //       placeholderName: "Name length !== 12"
    //     });
    //   } else {
    //     try {
    //       let privateKey;
    //       //check private key for 0x
    //       if(this.state.privateKey.substring(0,2) !=='0x'){
    //         privateKey=`0x${this.state.privateKey}`;
    //       }
    //       else{
    //         privateKey=this.state.privateKey;
    //       }
          
    //       console.log('private key = ', privateKey)
    //       //get Info
    //       const getInfo = await axios({
    //         metthod: "GET",
    //         url: `${thirdPath}get_info`
    //       });
    //       console.log("getInfo = ", getInfo.data.last_irreversible_block_id);
    //       const result = this.ref_block(getInfo.data.last_irreversible_block_id);
    //       console.log("result = ", result);

    //       // let msg = result.ref_block_num + "," + result.ref_block_prefix;
    //       // let msg = "123,123"
    //       // let msg = "hello world"
    //       let msg = this.state.name;
    //       console.log("msg = ", msg);
    //       let msghash = util.keccak256(msg);
    //       let msghash1 = web3.utils.sha3(msg);
    //       console.log("msghash = ", msghash);
    //       console.log("msghash1 = ", msghash1);

    //       //get account details
    //       const account = await web3.eth.getAccounts();
    //       console.log("acount", account);
          
    //       let sign = util.ecsign(msghash, util.toBuffer(privateKey));
    //       let sign1  = await web3.eth.sign(msghash1,account[0]);
    //       // let sign1  = await web3.eth.personal.sign(msghash1,account[0]);
    //       const { v, r, s } = util.fromRpcSig(sign1);

    //       console.log("sign1 = ", sign1);
    //       console.log("v1 = ", v.toString(16));
    //       console.log("s1 = ", s.toString("hex"));
    //       console.log("r1 = ", r.toString("hex"));
    //       let signature1 = `00${v.toString(16)}${r.toString("hex")}${s.toString("hex")}`;
    //       console.log("signature = ",signature1);


        
    //       console.log("sign = ", sign);
    //       console.log("v = ", sign.v.toString(16));
    //       // var v = sign.v.toString(16);
    //       console.log("s = ", sign.s.toString("hex"));
    //       console.log("r = ", sign.r.toString("hex"));
    //       let signature = `00${sign.v.toString(16)}${sign.r.toString("hex")}${sign.s.toString("hex")}`;
    //       console.log("signature = ",signature);
    //       let obj={
    //           name:this.state.name,
    //           publicKey:this.state.publicKey,
    //           signature:signature1
    //       }
    //       const createAccount = await axios({
    //         method: "post",
    //         url: `${basePath}user/signWithMetaMask`,
    //         json: true,
    //         data: obj
    //       });
    //       console.log("createAccount =>", createAccount);

    //     } catch (err) {
    //       console.log("err =>", err);
    //     }
    //   }
    // } else {
    //   this.setState({
    //     errorMsg: "please provide all parameters!",
    //     errorV: "visible"
    //   });
    // }


    //<---------------- 4th --------------------------->
    // const web3 = window.web3 ? new Web3(window.web3.currentProvider) : "";
    // this.setState({
    //   errorV: "hidden"
    // });
    // //get account details
    // const account = await web3.eth.getAccounts();
    // console.log("acount", account);
    // if(account.length===0){
      
    //   //metamask not login
    //   this.setState({
    //     errorMsg: "Please Login your MetaMask",
    //     errorV: "visible",
    //   })        
    // } 
    // else if (this.state.name && this.state.publicKey) {
    //   if (this.state.name.length !== 12) {
    //     this.setState({
    //       name: "",
    //       placeholderName: "Name length !== 12"
    //     });
    //   }else {
    //     try {

    //       //get info
    //       const getInfo = await axios({
    //         metthod: "GET",
    //         url: `${thirdPath}get_info`
    //       });
    //       console.log("blockId = ", getInfo.data);

    //       //get expiration time
    //       // let expireInSeconds = 2 * 60 * 60; //2hours
    //       // let chainDate = new Date(getInfo.data.head_block_time + 'Z');
    //       // let expiration = new Date(chainDate.getTime() + expireInSeconds * 1000)
    //       // expiration = expiration.toISOString().split('.')[0];
    //       // console.log('expiration = ', expiration);
    //       const result = this.ref_block(getInfo.data.last_irreversible_block_id);
    //       console.log("result = ", result);

    //       //generate msghash
    //       let msg = result.ref_block_num + "," + result.ref_block_prefix + this.state.publicKey;
    //       // let msg = 14136 + "," + 1050845499 + this.state.publicKey;
          
    //       // let msg = this.state.name;
    //       console.log("msg = ", msg);
    //       let newMsg =  "\x19Ethereum Signed Message:\n" + msg.length + msg;
    //       console.log("newmsg = ", newMsg);

    //       let msghash = createKeccakHash('keccak256').update(newMsg).digest()
    //       console.log('msghash = ', msghash.toString('hex'))

    //       let msghash1 = web3.utils.sha3(msg);
    //       console.log("msghash1 = ", msghash1); 
                 
    //       //sign to generate signature
    //       // let sign1  = await web3.eth.sign(msghash1,account[0]);
    //       let privateKey ="0xab8daaa4fae2dcc2869723a9df5362b701e034e5fd73ae804c01cf0b313cad88"
    //       let sign = util.ecsign(msghash, util.toBuffer(privateKey));
    //       console.log("sign = ", sign);
    //       console.log("v = ", sign.v.toString(16));
    //       var v = sign.v.toString(16);
    //       console.log("s = ", sign.s.toString("hex"));
    //       console.log("r = ", sign.r.toString("hex"));
    //       let signature = `00${v}${sign.r.toString("hex")}${sign.s.toString("hex")}`;
    //       console.log("signature = ",signature);


    //       let sign1  = await web3.eth.personal.sign(window.web3.toHex(msg),account[0]);
    //       const { v, r, s } = util.fromRpcSig(sign1);

    //       // console.log("sign1 = ", sign1);
    //       console.log("v1 = ", v.toString(16));
    //       console.log("s1 = ", s.toString("hex"));
    //       console.log("r1 = ", r.toString("hex"));
    //       let signature1 = `00${v.toString(16)}${r.toString("hex")}${s.toString("hex")}`;
    //       console.log("signature1 = ",signature1);

    //       //hit contract
    //       let obj={
    //           name:this.state.name,
    //           publicKey:this.state.publicKey,
    //           signature:signature1,
    //           ref_block_num:result.ref_block_num & 0xFFFF,
    //           ref_block_prefix:result.ref_block_prefix
    //       }
    //       const createAccount = await axios({
    //         method: "post",
    //         url: `${basePath}user/signWithMetaMask`,
    //         json: true,
    //         data: obj
    //       });
    //       console.log("createAccount =>", createAccount);

    //     } catch (err) {
    //       console.log("err =>", err);
    //     }
    //   }
    // } else {
    //   this.setState({
    //     errorMsg: "please provide all parameters!",
    //     errorV: "visible"
    //   });
    // }


  }
  render() {
    // if (window.web3) {
      return (
        <div className="App">
          <div className="container">
            <div className="header">Claim Your EOS Account</div>
            <div>
              <ul className="ul">
                <li className="leftli">Account Name</li>

                <li className="rightli">
                  <input
                    maxLength='12'
                    placeholder={this.state.placeholderName}
                    value={this.state.name}
                    onBlur={this.onBlurInput}
                    onChange={this.handleChange}
                  />
                  <div className='warning'>(a-z,1-5 are allowed only. Length 12)</div>
                </li>
                
              </ul>
              
              <ul className="ul">
                <li className="leftli">Public Key</li>
                <li className="rightli">
                  <input
                    placeholder={this.state.placeholderPublic}
                    value={this.state.publicKey}
                    onChange={e => {
                      this.setState({ 
                        publicKey: e.target.value, 
                        errorV:'hidden'});
                    }}
                  />
                </li>
              </ul>
              <div style={{ visibility: this.state.errorV }} className="errDiv">
                {this.state.errorMsg}
              </div>
              <button onClick={this.createAccount} 
                disabled={(window.web3===undefined || this.state.namePretty)?true:false}
                style={{cursor:(window.web3===undefined || this.state.namePretty)?'not-allowed':'pointer',
                opacity: (this.state.namePretty || window.web3 === undefined) ?'.5':'1'
                }}>Sign With MetaMask</button>
            </div>
          </div>
        </div>
      );
    // } else {
    //   return <div className='notExist' style={{border:'1px solid red'}}>
    //     <div className='notExitDiv'>
    //           <img src="http://www.medigapadvisors.com/medicare-supplement-blog/wp-content/uploads/2012/08/man-with-cross-sign-01-1.png"/>
    //           <div className='headingExit'>
    //             <h2>No ETH Account Available</h2>
    //           </div>
    //     </div>
    //   </div>;
    // }
  }
}

export default Sign;
