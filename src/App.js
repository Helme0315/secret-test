import './App.css';
import React, { useState, useEffect } from "react";
const { SecretNetworkClient, MsgExecuteContract } = require("secretjs");

const DENOM = 'SCRT';
const MINIMAL_DENOM = 'uscrt';

// Testnet Info
const GRPCWEB_URL = 'https://grpc.pulsar.scrttestnet.com';
const LCD_URL = 'https://api.pulsar.scrttestnet.com';
const RPC_URL = 'https://rpc.pulsar.scrttestnet.com';
const CHAIN_ID = 'pulsar-2';
const CHAIN_NAME = 'Secret Testnet'; 
const sSCRT = "secret18vd8fpwxzck93qlwghaj6arh4p7c5n8978vsyg";

let secretjs;
let permit;

function App() {
  const [myAddress, setMyAddress] = useState("");
  const [nativeBalance, setNativeBalance] = useState(0);
  const [wrapBalance, setWrapBalance] = useState(0);
  const [keplrReady, setKeplrReady] = useState(false);

  const [scrtConvertAmount, setScrtConvertAmount] = useState(0);
  const [sscrtConvertAmount, setSscrtConvertAmount] = useState(0);

  useEffect(() => {

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getKeplr = async () => {

      // Wait for Keplr to be injected to the page
      while (
        !window.keplr &&
        !window.getOfflineSigner &&
        !window.getEnigmaUtils
      ) {
        await sleep(10);
      }

      await window.keplr.experimentalSuggestChain({
        chainId: CHAIN_ID,
        chainName: CHAIN_NAME,
        rpc: RPC_URL,
        rest: LCD_URL,
        bip44: {
          coinType: 529,
        },
        coinType: 529,
        stakeCurrency: {
          coinDenom: DENOM,
          coinMinimalDenom: MINIMAL_DENOM,
          coinDecimals: 6,
        },
        bech32Config: {
          bech32PrefixAccAddr: "secret",
          bech32PrefixAccPub: "secretpub",
          bech32PrefixValAddr: "secretvaloper",
          bech32PrefixValPub: "secretvaloperpub",
          bech32PrefixConsAddr: "secretvalcons",
          bech32PrefixConsPub: "secretvalconspub",
        },
        currencies: [
          {
            coinDenom: DENOM,
            coinMinimalDenom: MINIMAL_DENOM,
            coinDecimals: 6,
          },
        ],
        feeCurrencies: [
          {
            coinDenom: DENOM,
            coinMinimalDenom: MINIMAL_DENOM,
            coinDecimals: 6,
          },
        ],
        gasPriceStep: {
          low: 0.1,
          average: 0.25,
          high: 0.4,
        },
        features: ["secretwasm"],
      });

      // Enable Keplr.
      // This pops-up a window for the user to allow keplr access to the webpage.
      await window.keplr.enable(CHAIN_ID);

      // Setup SecrtJS with Keplr's OfflineSigner
      // This pops-up a window for the user to sign on each tx we sent

      const keplrOfflineSigner = window.getOfflineSignerOnlyAmino(CHAIN_ID);

      const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();
      
      secretjs = new SecretNetworkClient({
        url: LCD_URL,
        chainId: CHAIN_ID,
        wallet: keplrOfflineSigner,
        walletAddress: myAddress,
        encryptionUtils: window.getEnigmaUtils(CHAIN_ID),
      });
      
      permit = await secretjs.utils.accessControl.permit.sign(
        myAddress,
        CHAIN_ID,
        "test",
        [sSCRT],
        ["owner", "balance"],
      );
      
      getTokenBalance();

      setKeplrReady(true);
      setMyAddress(myAddress);
 
    }
    getKeplr();
      
    return () => {};
  }, []);

  const getTokenBalance = async () => {
    const {
      balance: { amount },
    } = await secretjs.query.bank.balance(
      {
        address: myAddress,
        denom: MINIMAL_DENOM,
      }
    );
    setNativeBalance(new Intl.NumberFormat("en-US", {}).format(amount / 1e6))

    const wrapBalance = await secretjs.query.snip20.getBalance({
      address: myAddress,
      contract: { address: sSCRT },
      auth: { permit }
    })
    
    if(wrapBalance) {
      setWrapBalance(new Intl.NumberFormat("en-US", {}).format(wrapBalance.balance.amount / 1e6))
    }
    
  }

  const convertNativeToWrap = async () => {
    if(nativeBalance < scrtConvertAmount) {
      alert("Insufficient Balance");
    } else {
      const convertScrtMessage = new MsgExecuteContract({
        sender: myAddress,
        contract_address: sSCRT,
        msg: { deposit: {} },
        sent_funds: [{ amount: String(scrtConvertAmount * 1e6), denom: "uscrt" }]
      });
  
      const tx = await secretjs.tx.broadcast([convertScrtMessage], {
          gasLimit: 100_000,
      });
      console.log(tx);
      getTokenBalance();
      setScrtConvertAmount(0);
    }
    
  }

  const convertWrapToNative = async () => {
    if(wrapBalance < sscrtConvertAmount) {
      alert("Insufficient Balance");
    } else {
      const convertScrtMessage = new MsgExecuteContract({
        sender: myAddress,
        contract_address: sSCRT,
        msg: { redeem: {
          amount: String(sscrtConvertAmount * 1e6)
        } },
      });
  
      const tx = await secretjs.tx.broadcast([convertScrtMessage], {
          gasLimit: 100_000,
      });
      console.log(tx);
      getTokenBalance();
      setSscrtConvertAmount(0);
    }
  }

  return (
    <div className="App">
      <h1>ActList Secret Network Test Dapp</h1>

      {!keplrReady ? 
          <h1>Waiting for Keplr wallet integration...</h1>
      : 
        <div>
          <p>
            <strong>My Address:</strong> {myAddress}
          </p>
          <p>
            <strong>SCRT Balance:</strong> {nativeBalance} SCRT
          </p>

          <p>
            <strong>sSCRT Balance:</strong> {wrapBalance} sSCRT
          </p>
          <p>
            <input
              type="number" 
              value={scrtConvertAmount}
              onChange={(e) => setScrtConvertAmount(e.target.value)}
            />
            <button onClick={() => convertNativeToWrap()}>Convert SCRT to sSCRT</button>
          </p>
          <p>
            <input
              type="number" 
              value={sscrtConvertAmount}
              onChange={(e) => setSscrtConvertAmount(e.target.value)}
            />
            <button onClick={() => convertWrapToNative()}>Convert sSCRT to SCRT</button>
          </p>
        </div>
      }
    </div>
  );
}

export default App;
