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
  const [loginStatus, setLoginStatus] = useState(
    !useAppConfig.getState().needLogin,
  );
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [OrderInfo, setOrderInfo] = useState({
    id: "",
    amount: 0,
    url: "",
  });
  const accessStore = useAccessStore();

  const [showImage, setShowImage] = useState(false);
  const [urlCountDown, setUrlCountDown] = useState(60);
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
      timer = setTimeout(() => setUrlCountDown(urlCountDown - 1), 1000);
    } else {
      setShowImage(false);
      setCountdown(60);
    }
    return () => clearTimeout(timer);
  }, [showImage, urlCountDown]);

  useEffect(() => {
    if (notEmptyString(UserInfo.token)) {
      config.update((config) => (config.token = UserInfo.token));
      config.update(() => {
        config.needLogin = false;
      });
      accessStore.update((access) => (access.token = UserInfo.token));
    }
    if (notEmptyString(UserInfo.refreshToken)) {
      config.update((config) => (config.refreshToken = UserInfo.refreshToken));
    }
  }, [UserInfo]);

  useEffect(() => {
    // 调用接口获取下拉菜单数据
    const fetchData = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8080/v1/gpt/order/positionList",
        );
        if (response.ok) {
          const result: any = await response.json();
          if (result.code !== 200) {
            showToast(result.message);
            setDropdownOptions([]);
            return;
          }
          // 设置下拉菜单选项
          setDropdownOptions(result.data); // 替换 "data.options" 为实际从 API 获取的下拉菜单数据
        } else {
          console.error("Failed to fetch dropdown options");
        }
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
      }
    };
    // 组件加载时调用接口
    fetchData();
  }, [loginStatus]); // 空数组作为依赖，确保这段代码只在组件加载时执行一次

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
    setUserInfo(result.data);
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
    // 设置订单信息
    setOrderInfo(result.data);
    setShowImage(true);
  };

  return (
    <div className={chatStyle["new-chat"]}>
      <div className={chatStyle["mask-header"]}>
        <IconButton
          icon={<LeftIcon />}
          text={Locale.NewChat.Return}
          onClick={() => navigate(Path.Home)}
        ></IconButton>
      </div>

      {showImage && (
        <img src={OrderInfo.url} alt="Countdown" className={style["image"]} />
      )}

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
            <button onClick={refreshToken}>刷新</button>
          </div>
        </div>
      )}
    </div>
  );
}
