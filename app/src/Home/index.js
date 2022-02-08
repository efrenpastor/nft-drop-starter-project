import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Snackbar } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from '../CandyMachine';
import { Header } from '../Header';
import { MintButton } from '../MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';
import twitterLogo from '../assets/twitter-logo.svg';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``;


// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const Home = (props) => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [isUserMinting, setIsUserMinting] = useState(false)
  const [candyMachine, setCandyMachine] = useState(null)
  const [alertState, setAlertState] = useState({
    open: false,
    message: '',
    severity: undefined
  })

  const rpcUrl = props.rpcHost;
  const wallet = useWallet()

  const anchorWallet = useMemo(() => {
      if (
          !wallet ||
          !wallet.publicKey ||
          !wallet.signAllTransactions ||
          !wallet.signTransaction
      ) {
          return;
      }

      return {
          publicKey: wallet.publicKey,
          signAllTransactions: wallet.signAllTransactions,
          signTransaction: wallet.signTransaction
      }
  }, [wallet])

  const refreshCandyMachineState = useCallback(async () => {
      if (!anchorWallet) {
          return
      }

      if (props.candyMachineId) {
          try {
              const cndy = await getCandyMachineState(
                  anchorWallet,
                  props.candyMachineId,
                  props.connection,
              );
              console.log(JSON.stringify(cndy.state, null, 4));
              setCandyMachine(cndy);
          } catch (e) {
            console.log('There was a problem fetching Candy Machine state');
            console.log(e);
          }
      }
  }, [anchorWallet, props.candyMachineId, props.connection])

  const onMint = async () => {
      try {
        setIsUserMinting(true);
        setIsUserMinting(true);
        document.getElementById('#identity')?.click();
        if (wallet.connected && candyMachine?.program && wallet.publicKey) {
            const mintTxId = (await mintOneToken(candyMachine, wallet.publicKey))[0];
            let status = { err: true };
            if (mintTxId) {
            status = await awaitTransactionSignatureConfirmation(
                mintTxId,
                props.txTimeout,
                props.connection,
                true,
            );
            }

            if (status && !status.err) {
            setAlertState({
                open: true,
                message: 'Congratulations! Mint succeeded!',
                severity: 'success',
            });
            } else {
            setAlertState({
                open: true,
                message: 'Mint failed! Please try again!',
                severity: 'error',
            });
            }
        }
      } catch (error) {
        let message = error.msg || 'Minting failed! Please try again!';
        if (!error.msg) {
          if (!error.message) {
            message = 'Transaction Timeout! Please try again.';
          } else if (error.message.indexOf('0x137')) {
            message = `SOLD OUT!`;
          } else if (error.message.indexOf('0x135')) {
            message = `Insufficient funds to mint. Please fund your wallet.`;
          }
        } else {
          if (error.code === 311) {
            message = `SOLD OUT!`;
            window.location.reload();
          } else if (error.code === 312) {
            message = `Minting period hasn't started yet.`;
          }
        }
  
        setAlertState({
          open: true,
          message,
          severity: 'error',
        });
      } finally {
          setIsUserMinting(false)
      }
  }

  useEffect(() => {
      refreshCandyMachineState()
  }, [
      anchorWallet,
      props.candyMachineId,
      props.connection,
      refreshCandyMachineState
  ])

//   const checkWallet = async () => {
//     try {
//       const { solana } = window
//       if (solana && solana.isPhantom) {
//         console.log('Phantom wallet found!')
//         const response = await solana.connect({ onlyIfTrusted: true })
//         console.log(
//           'Connected with Public Key:',
//           response.publicKey.toString()
//         )

//         setWalletAddress(response.publicKey.toString())
//       } else {
//         alert('Solana object not found! Get a Phantom Wallet')
//       }
//     } catch (error) {
//       console.error(error)
//     }
//   }

//   useEffect(() => {
//     const onLoad = async () => {
//       await checkWallet()
//     }

//     window.addEventListener('load', onLoad)
//     return () => window.removeEventListener('load', onLoad)
//   }, [])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🍭 Candy Drop</p>
          <p className="sub-text">NFT drop machine with fair mint</p>
        </div>
        {!wallet.connected ? (
            <ConnectButton>Connect Wallet</ConnectButton>
        ) : (
            <>
            <Header candyMachine={candyMachine} />
            <MintContainer>
              {candyMachine?.state.isActive &&
              candyMachine?.state.gatekeeper &&
              wallet.publicKey &&
              wallet.signTransaction ? (
                <GatewayProvider
                  wallet={{
                    publicKey:
                      wallet.publicKey ||
                      new PublicKey(CANDY_MACHINE_PROGRAM),
                    //@ts-ignore
                    signTransaction: wallet.signTransaction,
                  }}
                  gatekeeperNetwork={
                    candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                  }
                  clusterUrl={rpcUrl}
                  options={{ autoShowModal: false }}
                >
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    onMint={onMint}
                  />
                </GatewayProvider>
              ) : (
                <MintButton
                  candyMachine={candyMachine}
                  isMinting={isUserMinting}
                  onMint={onMint}
                />
              )}
            </MintContainer>
            </>
        )}
        <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
        >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
        </Snackbar>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default Home;
