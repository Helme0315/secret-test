import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect } from "react";
const { SecretNetworkClient } = require("secretjs");

const DENOM = 'SCRT';
const MINIMAL_DENOM = 'uscrt';

// Testnet
const GRPCWEB_URL = 'https://grpc.pulsar.scrttestnet.com';
const LCD_URL = 'https://api.pulsar.scrttestnet.com';
const RPC_URL = 'https://rpc.pulsar.scrttestnet.com';
const CHAIN_ID = 'pulsar-2';
const CHAIN_NAME = 'Secret Testnet'; 
const sSCRT = "secret18vd8fpwxzck93qlwghaj6arh4p7c5n8978vsyg";
// Get codeHash using `secretcli q compute contract-hash secret18vd8fpwxzck93qlwghaj6arh4p7c5n8978vsyg`
const sScrtCodeHash = "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e";

function App() {
  const [myAddress, setMyAddress] = useState("");
  const [nativeBalance, setNativeBalance] = useState();
  const [wrapBalance, setWrapBalance] = useState();
  const [keplrReady, setKeplrReady] = useState(false);

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
      
      const secretjs = new SecretNetworkClient({
        url: LCD_URL,
        chainId: CHAIN_ID,
        wallet: keplrOfflineSigner,
        walletAddress: myAddress,
        encryptionUtils: window.getEnigmaUtils(CHAIN_ID),
      });
      
      const {
        balance: { amount },
      } = await secretjs.query.bank.balance(
        {
          address: myAddress,
          denom: MINIMAL_DENOM,
        }
      );
      setNativeBalance(new Intl.NumberFormat("en-US", {}).format(amount / 1e6))

      const { token_info } = await secretjs.query.compute.queryContract({
        contract_address: sSCRT,
        // code_hash: sScrtCodeHash, // optional but way faster
        query: { token_info: {} },
      });
      console.log("Wrapped Token: ", token_info);

      const temp = await secretjs.query.bank.balance(
        {
          address: myAddress,
          denom: "sscrt",
        }
      );
      console.log(temp);

      setKeplrReady(true);
      setMyAddress(myAddress);
      
    }
      getKeplr();
      
    return () => {};
  }, []);

  return (
    <div className="App">
      <h1>Secret Dapp</h1>

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
        </div>
      }
    </div>
  );
}

export default App;
