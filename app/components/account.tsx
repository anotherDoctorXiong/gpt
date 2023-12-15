import React, { useState, useEffect } from "react";
import { showConfirm, showToast } from "./ui-lib";
import { useAccessStore, useAppConfig } from "../store";
import { notEmptyString } from "@/app/utils/format";
import { getHeaders } from "@/app/client/api";

import style from "./account.module.scss";
import chatStyle from "./new-chat.module.scss";
import { useLocation, useNavigate } from "react-router-dom";
import { IconButton } from "@/app/components/button";
import LeftIcon from "@/app/icons/left.svg";
import Locale from "@/app/locales";
import { Path } from "@/app/constant";
import ui from "./ui-lib.module.scss";

export function Account() {
  const [UserInfo, setUserInfo] = useState({
    phone: "",
    balance: 0,
    captcha: "",
    token: "",
    refreshToken: "",
  });
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const config = useAppConfig();
  const [loginStatus, setLoginStatus] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [OrderInfo, setOrderInfo] = useState({
    amount: 0,
    realAmount: 0,
    url: "",
  });
  const accessStore = useAccessStore();

  const [showImage, setShowImage] = useState(false);
  const [urlCountDown, setUrlCountDown] = useState(180);
  const navigate = useNavigate();

  // 验证码倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCodeSent && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setIsCodeSent(false);
      setCountdown(60);
    }

    return () => clearTimeout(timer);
  }, [isCodeSent, countdown]);

  // 充值二维码倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showImage && urlCountDown > 0) {
      timer = setTimeout(() => {
        setUrlCountDown(urlCountDown - 2);
        getPayStatus().then((r) => {
          // 支付成功关闭二维码,更新用户信息
          if (r) {
            getUserInfo().then((r) => {
              setShowImage(false);
              clearTimeout(timer);
            });
          }
        });
      }, 2000);
    } else {
      setShowImage(false);
      setCountdown(180);
    }
    return () => clearTimeout(timer);
  }, [showImage, urlCountDown]);

  useEffect(() => {
    if (notEmptyString(UserInfo.token)) {
      config.update((config) => (config.token = UserInfo.token));
      accessStore.update((access) => (access.token = UserInfo.token));
    }
    if (notEmptyString(UserInfo.refreshToken)) {
      config.update((config) => (config.refreshToken = UserInfo.refreshToken));
    }
    if (notEmptyString(UserInfo.phone) && notEmptyString(UserInfo.balance)) {
      setLoginStatus(true);
    }
  }, [UserInfo]);

  // 订单状态变化
  useEffect(() => {
    if (notEmptyString(OrderInfo.url) && notEmptyString(OrderInfo.amount)) {
      setShowImage(true);
      getOrderList();
    }
    console.log("OrderInfo ", OrderInfo);
  }, [OrderInfo.amount]);

  useEffect(() => {
    getOrderList();
  }, [loginStatus]);

  // 组件挂载时执行一次
  useEffect(() => {
    // 通过token获取用户信息并校验token是否有效
    getUserInfo().then((success) => {
      if (!success) {
        // 失败则尝试通过refreshToken重新获取token
        refreshToken().then((r) => {});
      }
    });
  }, []);

  const getOrderList = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/order/positionList", {
      headers: getHeaders(),
      method: "GET",
    });

    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      setDropdownOptions([]);
      return;
    }

    // 设置下拉菜单数据
    setDropdownOptions(result.data);
    setOrderInfo({ ...OrderInfo, amount: dropdownOptions[0] });
  };

  const getUserInfo = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/user/info", {
      headers: getHeaders(),
      method: "GET",
    });

    const result: any = await res.json();
    if (result.code !== 200) {
      return false;
    }
    setLoginStatus(true);
    setUserInfo(result.data);
    return true;
  };

  const sendLoginCode = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/user/loginCode", {
      body: JSON.stringify(UserInfo),
      headers: getHeaders(),
      method: "POST",
    });

    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      return;
    }
    // 模拟发送成功后的操作
    setIsCodeSent(true);
  };

  const handleLogin = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/user/login", {
      body: JSON.stringify(UserInfo),
      headers: getHeaders(),
      method: "POST",
    });

    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      return;
    }
    // 处理相关数据
    setUserInfo(result.data);
    setLoginStatus(true);
  };

  const refreshToken = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/user/refreshToken", {
      body: JSON.stringify(config),
      headers: getHeaders(),
      method: "POST",
    });

    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      return false;
    }
    // 模拟发送成功后的操作
    setUserInfo(result.data);
    return true;
  };

  const createOrder = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/order/create", {
      body: JSON.stringify(OrderInfo),
      headers: getHeaders(),
      method: "POST",
    });

    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      return;
    }

    setOrderInfo(result.data);
    // 设置订单信息
    setShowImage(true);
  };

  const getPayStatus = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/order/pay/status", {
      body: JSON.stringify(OrderInfo),
      headers: getHeaders(),
      method: "POST",
    });
    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
      return false;
    }
    if (result.data) {
      return true;
    }
  };

  const cancelOrder = async () => {
    const res = await fetch("http://127.0.0.1:8080/v1/gpt/order/pay/cancel", {
      body: JSON.stringify(OrderInfo),
      headers: getHeaders(),
      method: "POST",
    });

    // 解析返回的 JSON 数据
    const result: any = await res.json();
    if (result.code !== 200) {
      showToast(result.message);
    }
    setShowImage(false);
  };

  return (
    <div className={chatStyle["new-chat"]}>
      <div className={chatStyle["mask-header"]}>
        <IconButton
          icon={<LeftIcon />}
          text={Locale.NewChat.Return}
          onClick={() => {
            if (showImage) {
              setShowImage(false);
            } else {
              navigate(Path.Home);
            }
          }}
        ></IconButton>
      </div>
      {!loginStatus ? (
        <div className={style["account"]}>
          <div className={style["input"]}>
            <input
              type="text"
              value={UserInfo.phone}
              placeholder="请输入手机号码"
              className={ui["full"]}
              onChange={(e) => {
                setUserInfo({ ...UserInfo, phone: e.target.value });
              }}
            />
          </div>
          <div className={style["input"]}>
            <input
              type="text"
              value={UserInfo.captcha}
              onChange={(e) => {
                setUserInfo({ ...UserInfo, captcha: e.target.value });
              }}
              className={ui["full"]}
              placeholder="请输入验证码"
            />
            {!isCodeSent ? (
              <button onClick={sendLoginCode}>发送验证码</button>
            ) : (
              <button>验证码已发送 ({countdown}s)</button>
            )}
          </div>
          <div className={style["input"]}>
            <button onClick={handleLogin} className={ui["full"]}>
              登录
            </button>
          </div>
        </div>
      ) : showImage ? (
        <div className={style["account"]}>
          <img
            src={OrderInfo.url}
            loading="lazy"
            style={{ width: "30%", height: "60%" }}
          />
          <div className={style["input"]}>
            <button onClick={cancelOrder} className={ui["full"]}>
              取消支付
            </button>
          </div>
        </div>
      ) : (
        <div className={style["account"]}>
          <div className={style["input"]}>
            <strong>手机号:</strong> {UserInfo.phone}
          </div>
          <div className={style["input"]}>
            <strong>余额:</strong> ${UserInfo.balance}
          </div>
          <div className={style["input"]}>
            <strong>选择充值档位:</strong>
            <select
              value={OrderInfo.amount}
              onChange={(event) => {
                setOrderInfo({
                  ...OrderInfo,
                  amount: parseInt(event.target.value),
                });
              }}
            >
              {dropdownOptions.map((value, index) => (
                <option key={index} value={value}>
                  {value / 100 + "元"}
                </option>
              ))}
            </select>
          </div>

          <div className={style["input"]}>
            <button onClick={createOrder}>充值</button>
            {urlCountDown}
          </div>

          <div className={style["input"]}>
            <button
              onClick={() => {
                setLoginStatus(false);
              }}
            >
              重新登录
            </button>
            <button onClick={getUserInfo}>刷新</button>
          </div>
        </div>
      )}
    </div>
  );
}
