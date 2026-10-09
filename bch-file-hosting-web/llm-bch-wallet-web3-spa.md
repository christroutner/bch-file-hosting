Project Path: bch-wallet-web3-spa

Source Tree:

```
bch-wallet-web3-spa
├── PEDIGREE.md
├── src
│   ├── index.js
│   ├── util
│   │   └── index.js
│   ├── components
│   │   ├── footer
│   │   │   ├── index.js
│   │   │   └── get-cid.js
│   │   ├── nav-menu
│   │   │   ├── index.js
│   │   │   └── psf-logo.png
│   │   ├── app-body
│   │   │   ├── balance.js
│   │   │   ├── index.js
│   │   │   ├── bch-send
│   │   │   │   ├── index.js
│   │   │   │   ├── send-card.js
│   │   │   │   ├── refresh-balance.js
│   │   │   │   ├── balance-card.js
│   │   │   │   ├── receive-card.js
│   │   │   │   └── refresh-bch-balance-button.js
│   │   │   ├── configuration
│   │   │   │   ├── index.js
│   │   │   │   ├── select-server-button.js
│   │   │   │   └── select-server-view.js
│   │   │   ├── sign
│   │   │   │   └── index.js
│   │   │   ├── slp-tokens
│   │   │   │   ├── send-token-button.js
│   │   │   │   ├── index.js
│   │   │   │   ├── info-button.js
│   │   │   │   ├── token-card.js
│   │   │   │   └── refresh-tokens.js
│   │   │   ├── placeholder2.js
│   │   │   ├── bch-wallet
│   │   │   │   ├── optimize-wallet.js
│   │   │   │   ├── index.js
│   │   │   │   ├── clear-wallet.js
│   │   │   │   ├── wallet-summary.css
│   │   │   │   ├── import-wallet.js
│   │   │   │   ├── wallet-summary.js
│   │   │   │   ├── warning.js
│   │   │   │   └── copy-on-click.js
│   │   │   ├── sweep
│   │   │   │   └── index.js
│   │   │   └── placeholder3.js
│   │   ├── starter-views.js
│   │   ├── waiting-modal
│   │   │   └── index.js
│   │   └── load-scripts.js
│   ├── hooks
│   │   ├── state.js
│   │   └── use-script.js
│   ├── App.test.js
│   ├── config
│   │   └── index.js
│   ├── App.css
│   ├── services
│   │   ├── async-load.js
│   │   └── gist-servers.js
│   └── App.js
├── README.md
├── LICENSE.md
├── img
│   └── donation-qr.png
├── dev-docs
│   └── README.md
├── package.json
├── deploy
│   ├── publish-main.js
│   ├── README.md
│   ├── publish-pinata.js
│   ├── publish-filecoin.js
│   ├── publish-gh-pages.sh
│   └── publish-bch.js
└── public
    └── index.html

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/PEDIGREE.md`:

```md
# Pedigree

This code repository is forked from [react-bootstrap-web3-spa](https://github.com/Permissionless-Software-Foundation/react-bootstrap-web3-spa), and any updates to that upstream repository are pulled into this repository.
```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/index.js`:

```js
/*
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { QueryParamProvider } from 'use-query-params'

// Importing the Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter } from 'react-router-dom'

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <QueryParamProvider>
    {/* <BrowserRouter> should be wrap all the components that use react-router-dom */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryParamProvider>
)

// Updating to React v18
// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/util/index.js`:

```js
/*
  A utility library for holding functions that are commonly used by many different
  areas of the app.
*/

class AppUtil {
  // Returns a promise that resolves 'ms' milliseconds.
  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Copy a text to clipboard
  async copyToClipboard (text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }

  // Read text from clipboard
  async readFromClipboard () {
    try {
      const text = await navigator.clipboard.readText()

      return text
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }
}

export default AppUtil

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/footer/index.js`:

```js
/*
  A footer section for the SPA
*/

// Global npm libraries
import React, { useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'

// Local libraries
import config from '../../config'
// import Memo from './get-cid'

function Footer (props) {
  // const [ipfsCid, setIpfsCid] = useState(config.ipfsCid)
  const wallet = props.appData.wallet

  // Retrieve the most up-to-date CID for the app on Filecoin from the BCH blockchain.
  useEffect(() => {
    async function fetchData () {
      try {
        // const hash = await getUpdatedUrl(wallet)
        // if (hash) {
        //   setIpfsCid(hash)
        // }
      } catch (err) {
        console.error('Error trying to retrieve Filecoin CID for the app from the BCH blockchain.')
      }
    }
    fetchData()
  }, [wallet])

  return (
    <Container style={{ backgroundColor: '#ddd' }}>
      <Row style={{ padding: '25px' }}>
        <Col>
          <h6>Source Code</h6>
          <ul>
            <li>
              <a href={config.ghRepo} target='_blank' rel='noreferrer'>GitHub</a>
            </li>

          </ul>
        </Col>

        <Col />
      </Row>
    </Container>
  )
}

// async function getUpdatedUrl (wallet) {
//   try {
//     // Exit if the wallet is not initialized.
//     if (!wallet) return

//     // Initialize the memo library for retrieving data from the BCH blockchain.
//     const memo = new Memo({ bchAddr: config.appBchAddr })
//     await memo.initialize(wallet)
//     const hash = await memo.findHash()

//     if (!hash) {
//       console.error(
//         `Could not find IPFS hash in transactions for address ${config.appBchAddr}`
//       )
//       return false
//     }
//     // console.log(`latest IPFS hash: ${hash}`)

//     return hash
//   } catch (err) {
//     console.log('Error in getUpdatedUrl(): ', err)
//   }
// }

export default Footer

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/footer/get-cid.js`:

```js
/*
  This service file contains functions for retrieving an IPFS hash from the
  BCH blockchain, in a fasion similar to PS001:
  https://github.com/Permissionless-Software-Foundation/specifications/blob/master/ps001-media-sharing.md
*/

// Global npm libraries
import BchMessage from 'bch-message-lib'

// Local libraries
import AppUtil from '../../util'

class Memo {
  constructor (config) {
    this.config = config

    // Encapsulate dependencies
    this.util = new AppUtil()
  }

  // Instantiate the bch-message-lib library.
  async initialize (wallet) {
    try {
      // Throw an error if this class is instantiated without passing a BCH address.
      if (!this.config || !this.config.bchAddr) {
        throw new Error('Must pass a BCH address to Memo constructor.')
      } else {
        this.bchAddr = this.config.bchAddr
      }

      this.wallet = wallet

      this.bchMessage = new BchMessage({ wallet })
    } catch (err) {
      console.error('Error in get-cid.js/initialize(): ', err.message)
      // console.log('Waiting 5 seconds before trying again.')
      // await this.util.sleep(5000)
      // this.initialize()
    }
  }

  // Walk the transactions associated with an address until a proper IPFS hash is
  // found. If one is not found, will return false.
  async findHash () {
    try {
      console.log(`Finding latest IPFS hash for address: ${this.bchAddr}...`)

      const txs = await this.bchMessage.memo.memoRead(
        this.bchAddr,
        'IPFS UPDATE'
      )
      // console.log(`txs: ${JSON.stringify(txs, null, 2)}`)

      // If the array is empty, then return false.
      if (txs.length === 0) return false

      const hash = txs[0].subject
      console.log(`...found this IPFS hash: ${hash}`)

      // The transactions should automatically be sorted by the bchMessage
      // library. So Just return the subject.
      return hash
    } catch (err) {
      console.warn('Could not find IPFS hash in transaction history.')
      return false
    }
  }
}

export default Memo

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/nav-menu/index.js`:

```js
/*
  This component controlls the navigation menu.

  Inspired from this example:
  https://codesandbox.io/s/react-bootstrap-hamburger-menu-example-rnud4?from-embed
*/

// Global npm libraries
import React, { useState } from 'react'
import { Nav, Navbar, Image } from 'react-bootstrap' // Used for Navbar Style and Layouts .
import { NavLink } from 'react-router-dom' // Used to navigate between routes

// Assets
import Logo from './psf-logo.png'

function NavMenu (props) {
  // Get the current path
  const { currentPath } = props.appData

  // Navbar state
  const [expanded, setExpanded] = useState(false)

  // Handle click event
  const handleClickEvent = () => {
    // Collapse the navbar
    setExpanded(false)
  }

  return (
    <>
      <Navbar expanded={expanded} onToggle={setExpanded} expand='xxxl' bg='dark' variant='dark' style={{ paddingRight: '20px' }}>
        <Navbar.Brand href='#home' style={{ paddingLeft: '20px' }}>
          <Image src={Logo} thumbnail width='50' />{' '}
          SLP Wallet
        </Navbar.Brand>

        <Navbar.Toggle aria-controls='responsive-navbar-nav' />
        <Navbar.Collapse id='responsive-navbar-nav'>
          <Nav className='mr-auto'>

            <NavLink
              className={(currentPath === '/bch' || currentPath === '/') ? 'nav-link-active' : 'nav-link-inactive'}
              to='/bch'
              onClick={handleClickEvent}
            >
              BCH
            </NavLink>

            <NavLink
              className={currentPath === '/slp-tokens' ? 'nav-link-active' : 'nav-link-inactive'}
              to='/slp-tokens'
              onClick={handleClickEvent}
            >
              Tokens
            </NavLink>

            <NavLink
              className={currentPath === '/wallet' ? 'nav-link-active' : 'nav-link-inactive'}
              to='/wallet'
              onClick={handleClickEvent}

            >
              Wallet
            </NavLink>

            <NavLink
              className={(currentPath === '/balance') ? 'nav-link-active' : 'nav-link-inactive'}
              to='/balance'
              onClick={handleClickEvent}
            >
              Check Balance
            </NavLink>
            <NavLink
              className={(currentPath === '/sweep') ? 'nav-link-active' : 'nav-link-inactive'}
              to='/sweep'
              onClick={handleClickEvent}
            >
              Sweep
            </NavLink>
            <NavLink
              className={(currentPath === '/sign') ? 'nav-link-active' : 'nav-link-inactive'}
              to='/sign'
              onClick={handleClickEvent}
            >
              Sign
            </NavLink>
            <NavLink
              className={currentPath === '/configuration' ? 'nav-link-active' : 'nav-link-inactive'}
              to='/configuration'
              onClick={handleClickEvent}
            >
              Configuration
            </NavLink>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  )
}

export default NavMenu

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/balance.js`:

```js
/*
  Component for looking up the balance of a BCH address.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap'

function GetBalance (props) {
  const { wallet } = props

  // State
  const [balance, setBalance] = useState('')
  const [textInput, setTextInput] = useState('')

  // Button click handler
  const handleGetBalance = async (e) => {
    e.preventDefault()
    try {
      // Exit on invalid input
      if (!textInput) return
      if (!textInput.includes('bitcoincash:')) return

      setBalance(
        <div className='balance-spinner-container'>
          <span>Retrieving balance...</span>
          <Spinner animation='border' />
        </div>
      )

      const balance = await wallet.getBalance({ bchAddress: textInput })
      console.log('balance: ', balance)

      const bchBalance = wallet.bchjs.BitcoinCash.toBitcoinCash(balance)

      setBalance(`Balance: ${balance} sats, ${bchBalance} BCH`)
    } catch (err) {
      setBalance(<p><b>Error</b>: {`${err.message}`}</p>)
    }
  }

  return (
    <>
      <Container>
        <Row>
          <Col className='text-break' style={{ textAlign: 'center' }}>
            <Form onSubmit={handleGetBalance}>
              <Form.Group className='mb-3' controlId='formBasicEmail'>
                <Form.Label>Enter any BCH address to query its balance on the blockchain.</Form.Label>
                <Form.Control type='text' placeholder='bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' onChange={e => setTextInput(e.target.value)} />
              </Form.Group>

              <Button variant='primary' onClick={handleGetBalance}>
                Check Balance
              </Button>
            </Form>
          </Col>
        </Row>
        <br />
        <Row>
          <Col style={{ textAlign: 'center' }}>
            {balance}
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default GetBalance

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/index.js`:

```js
/*
  This Body component is a container for all the different Views of the app.
  Views are equivalent to 'pages' in a multi-page app. Views are hidden or
  displayed to simulate the use of pages in an SPA.
  The Body app contains all the Views and chooses which to show, based on
  the state of the Menu component.
*/

// Global npm libraries
import React from 'react'
import { Route, Routes } from 'react-router-dom'

// Local libraries
import GetBalance from './balance'
import Wallet from './bch-wallet'
import Placeholder2 from './placeholder2'
import Placeholder3 from './placeholder3'
// import ServerSelectView from './servers/select-server-view'
// import SelectServerButton from './servers/select-server-button'
import BchSend from './bch-send'
import SlpTokens from './slp-tokens'
import SweepWif from './sweep/index.js'
import SignMessage from './sign/index.js'
import ServerSelectView from './configuration/select-server-view'

function AppBody (props) {
  // Dependency injection through props
  const appData = props.appData

  return (
    <>
      <Routes>
        <Route path='/' element={<BchSend appData={appData} />} />
        <Route path='/balance' element={<GetBalance wallet={appData.wallet} />} />
        <Route path='/bch' element={<BchSend appData={appData} />} />
        <Route path='/wallet' element={<Wallet appData={appData} />} />
        <Route path='/slp-tokens' element={<SlpTokens appData={appData} />} />
        <Route path='/placeholder2' element={<Placeholder2 />} />
        <Route path='/placeholder3' element={<Placeholder3 />} />
        <Route path='/servers' element={<ServerSelectView appData={appData} />} />
        <Route path='/sweep' element={<SweepWif appData={appData} />} />
        <Route path='/sign' element={<SignMessage appData={appData} />} />
        <Route path='/configuration' element={<ServerSelectView appData={appData} />} />
      </Routes>
      {/** Show in all paths except the servers view */}
      {/* {appData.currentPath !== '/servers' && <SelectServerButton linkTo='/servers' appData={appData} />} */}
    </>
  )
}

export default AppBody

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/index.js`:

```js
/*
  This View allows sending and receiving of BCH
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import RefreshBchBalanceButton from './refresh-bch-balance-button'
import SendCard from './send-card'
import BalanceCard from './balance-card'
import ReceiveCard from './receive-card'

// Working array for storing modal output.
// this.modalBody = []

function BchSend ({ appData }) {
  return (
    <>
      <Container>
        <Row>
          <Col xs={6}>
            <RefreshBchBalanceButton
              appData={appData}
            />
          </Col>
          <Col xs={6} style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/KN1ZMWoLoGs' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>
        <br />

        <Row>
          <Col style={{ textAlign: 'center' }}>
            <BalanceCard appData={appData} />
          </Col>
        </Row>
        <br />

        <Row>
          <Col>
            <SendCard
              appData={appData}
            />
          </Col>
        </Row>
        <br />

        <Row>
          <Col>
            <ReceiveCard appData={appData} />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default BchSend

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/send-card.js`:

```js
/*
  This component controls sending of BCH.
*/

// Global npm libraries
import React, { useState, useRef } from 'react'
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaste, faRandom } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import WaitingModal from '../../waiting-modal'
import RefreshBchBalance from './refresh-balance'

function SendCard (props) {
  // Dependency injection through props
  const appData = props.appData

  // Modal State
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [hideWaitingModal, setHideWaitingModal] = useState(true)
  const [hideModal, setHideModal] = useState(true)

  // Form State
  const [bchAddr, setBchAddr] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [amountUnits, setAmountUnits] = useState('USD')
  const [oppositeUnits, setOppositeUnits] = useState('BCH')
  const [oppositeQty, setOppositeQty] = useState(0)

  // Child function references
  const refreshBchBalanceRef = useRef()

  // Update the balance of the wallet.
  async function handleButtonRefreshBalance (appData) {
    // Call the child function
    refreshBchBalanceRef.current.handleRefreshBalance(appData)
  }

  // Encapsulate the state for this component into a single object that can
  // be passed around to subfunctions and subcomponents.
  const sendCardData = {
    modalBody,
    setModalBody,
    hideSpinner,
    setHideSpinner,
    hideWaitingModal,
    setHideWaitingModal,
    hideModal,
    setHideModal,
    bchAddr,
    setBchAddr,
    amountStr,
    setAmountStr,
    amountUnits,
    setAmountUnits,
    oppositeUnits,
    setOppositeUnits,
    oppositeQty,
    setOppositeQty
  }

  // This function is called when the modal is closed.
  function onModalClose () {
    sendCardData.setHideModal(true)

    handleButtonRefreshBalance(appData)
  }

  async function pasteFromClipboard () {
    try {
      const addr = await appData.appUtil.readFromClipboard()
      sendCardData.setBchAddr(addr)
    } catch (err) {
      // Browser implementation. Exit quietly.
    }
  }

  // This is an on-change event handler that updates the amount calculated in
  // both BCH and USD as the user types.
  function handleUpdateAmount (inObj = {}) {
    try {
      const { event, appData, sendCardData } = inObj

      // Update the state of the text box.
      let amountStr = event.target.value
      sendCardData.setAmountStr(amountStr)
      if (!amountStr) amountStr = '0'

      // Convert the string to a number.
      const amountQty = parseFloat(amountStr)

      const bchUsdPrice = appData.bchWalletState.bchUsdPrice
      const bchjs = appData.wallet.bchjs

      // Initialize local variables
      let oppositeQty = 0
      // const amountUsd = 0
      // const amountBch = 0

      // Calculate the amount in the opposite units.
      const currentUnit = sendCardData.amountUnits
      if (currentUnit.includes('USD')) {
        // Convert USD to BCH
        oppositeQty = bchjs.Util.floor8(amountQty / bchUsdPrice)
        // amountUsd = amountQty
        // amountBch = oppositeQty
      } else {
        // Convert BCH to USD
        oppositeQty = bchjs.Util.floor2(amountQty * bchUsdPrice)
        // amountUsd = oppositeQty
        // amountBch = amountQty
      }

      // Update app state
      sendCardData.setOppositeQty(oppositeQty)
    } catch (err) {
      /* exit quietly */
      console.log('Error: ', err)
    }
  }

  // This is a click event handler that toggles the units between BCH and USD.
  function handleSwitchUnits ({ sendCardData }) {
    // Toggle the unit
    let newUnit = ''
    let oppositeUnits = ''
    const oldUnit = sendCardData.amountUnits
    if (oldUnit.includes('USD')) {
      newUnit = 'BCH'
      oppositeUnits = 'USD'
    } else {
      newUnit = 'USD'
      oppositeUnits = 'BCH'
    }

    // Clear the Amount text box
    sendCardData.setAmountStr('')
    sendCardData.setOppositeQty(0)

    // Persist the new units.
    sendCardData.setAmountUnits(newUnit)
    sendCardData.setOppositeUnits(oppositeUnits)
  }

  // Add a new line to the waiting modal.
  function addToModal (inStr, sendCardData) {
    sendCardData.setModalBody(prevBody => {
      prevBody.push(inStr)
      return prevBody
    })
  }

  // Send BCH based to the address in the form, and the amount specified in the
  // form.
  async function handleSendBch ({ sendCardData, appData }) {
    console.log('Sending BCH')
    try {
      // Clear the modal body
      sendCardData.setModalBody([])
      sendCardData.setHideSpinner(false)

      // Open the modal
      sendCardData.setHideModal(false)

      let amountBch
      if (sendCardData.amountUnits === 'USD') {
        amountBch = sendCardData.oppositeQty
      } else {
        amountBch = parseFloat(sendCardData.amountStr)
      }
      console.log('amountBch: ', amountBch)

      if (amountBch < 0.00000546) throw new Error('Trying to send less than dust.')

      let bchAddr = sendCardData.bchAddr
      let infoStr = `Sending ${amountBch} BCH ($${sendCardData.amountUsd} USD) to ${bchAddr}`
      console.log(infoStr)

      // Update modal
      addToModal('Preparing to send bch...', sendCardData)

      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // If the address is an SLP address, convert it to a cash address.
      if (bchAddr.includes('simpleledger:')) {
        bchAddr = bchjs.SLP.Address.toCashAddress(bchAddr)
      }

      // Convert the BCH to satoshis
      const sats = bchjs.BitcoinCash.toSatoshi(amountBch)

      // Update the wallets UTXOs
      infoStr = 'Updating UTXOs...'
      console.log(infoStr)
      addToModal(infoStr, sendCardData)
      await wallet.getUtxos()

      const receivers = [{
        address: bchAddr,
        amountSat: sats
      }]
      const txid = await wallet.send(receivers)

      // Display TXID
      infoStr = `txid: ${txid}`
      // console.log(infoStr)
      // modalBody.push(infoStr)
      addToModal(infoStr, sendCardData)

      // Link to block explorer
      const explorerUrl = `https://blockchair.com/bitcoin-cash/transaction/${txid}`
      const explorerLink = (<a href={`${explorerUrl}`} target='_blank' rel='noreferrer'>Block Explorer</a>)
      // modalBody.push(explorerLink)
      addToModal(explorerLink, sendCardData)

      sendCardData.setHideSpinner(true)
      sendCardData.setBchAddr('')
      sendCardData.setAmountStr('')
    } catch (err) {
      console.log('Error in handleSendBch(): ', err)

      sendCardData.setModalBody([`Error: ${err.message}`])
      sendCardData.setHideSpinner(true)
    }
  }

  return (
    <>
      {
        hideModal
          ? null
          : (<WaitingModal
              heading='Sending BCH'
              body={modalBody}
              hideSpinner={hideSpinner}
              closeFunc={onModalClose}
              closeModalData={{ appData, sendCardData }}
             />)
      }

      <RefreshBchBalance appData={appData} ref={refreshBchBalanceRef} />

      <Card>
        <Card.Body>
          <Card.Title style={{ textAlign: 'center' }}>
            <h2><FontAwesomeIcon icon={faPaperPlane} size='lg' /> Send</h2>
          </Card.Title>
          <br />

          <Container>
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>BCH Address:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={12} style={{ textAlign: 'center' }}>
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Form.Group controlId='formBasicEmail' style={{ display: 'flex', alignItems: 'center' }}>
                    <Form.Control
                      style={{ marginRight: '1rem' }}
                      type='text'
                      placeholder='bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
                      onChange={e => setBchAddr(e.target.value)}
                      value={bchAddr}
                    />
                    <FontAwesomeIcon
                      style={{ cursor: 'pointer' }}
                      icon={faPaste}
                      size='lg'
                      onClick={(e) => pasteFromClipboard()}
                    />
                  </Form.Group>
                </Form>
              </Col>

            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>Amount:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={12}>
                <Form style={{ paddingBottom: '10px' }} onSubmit={(e) => { e.preventDefault(); handleSendBch({ sendCardData, appData }) }}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='number'
                      onChange={(event) => handleUpdateAmount({ event, appData, sendCardData })}
                      value={amountStr}
                    />
                  </Form.Group>
                </Form>
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <strong>Units</strong> : {amountUnits}
                <FontAwesomeIcon
                  style={{ cursor: 'pointer', marginLeft: '5px' }}
                  icon={faRandom}
                  size='lg'
                  onClick={(e) => handleSwitchUnits({ sendCardData, appData })}
                />
              </Col>
              <Col xs={6} style={{ textAlign: 'right' }}>
                <strong>{oppositeUnits}</strong> : {oppositeQty}
              </Col>
            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <Button onClick={(e) => handleSendBch({ sendCardData, appData })}>Send</Button>
              </Col>
            </Row>

          </Container>
        </Card.Body>
      </Card>
    </>
  )
}

export default SendCard

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/refresh-balance.js`:

```js
/*
  This library exports a RefreshBalance functional Component and a
  refreshBalance() function.
  The RefreshBalance Component is rendered as a hidden Waiting modal.
  When the refreshBalance() function is called, it causes the modal to
  appear while the wallet balance is updated. Once updated, the modal is hidden
  again.
*/

// Global npm libraries
import React, { useEffect, useState, useCallback } from 'react'

// Local libraries
import WaitingModal from '../../waiting-modal'

export default function RefreshBchBalance (props) {
  // Dependency injections of props
  const { ref } = props

  // State
  const [showWaitingModal, setShowWaitingModal] = useState(false)
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner] = useState(false)

  // Add a new line to the waiting modal.
  const addToModal = useCallback((inStr) => {
    // console.log('addToModal() inStr: ', inStr)
    setModalBody(prevBody => {
      // console.log('prevBody: ', prevBody)
      prevBody.push(inStr)
      return prevBody
    })
  }, [])

  // Update the balance of the wallet.
  const handleRefreshBalance = useCallback(async (appData) => {
    try {
      setModalBody([])

      // Throw up the waiting modal
      setShowWaitingModal(true)

      addToModal('Updating wallet balance...')

      // Get handles on app data.
      const walletState = appData.bchWalletState
      const cashAddr = appData.bchWalletState.cashAddress
      const wallet = appData.wallet

      // Get the latest balance of the wallet.
      const newBalance = await wallet.getBalance({ bchAddress: cashAddr })

      addToModal('Updating BCH per USD price...')
      const bchUsdPrice = await wallet.getUsd()

      // Update the wallet state.
      walletState.bchBalance = newBalance
      walletState.bchUsdPrice = bchUsdPrice
      appData.updateBchWalletState({ walletState, appData })

      setShowWaitingModal(false)
      setModalBody([])
    } catch (err) {
      console.error('Error while trying to update BCH balance: ', err)

      addToModal([`Error: ${err.message}`])
      setShowWaitingModal(false)
    }
  }, [addToModal])

  // add a ref to the handleRefreshBalance function
  // This is used to call the function from the parent component.
  useEffect(() => {
    if (ref && !ref.current) ref.current = { handleRefreshBalance }
  }, [ref, handleRefreshBalance])

  return (
    <>
      <>
        {showWaitingModal && (
          <WaitingModal
            heading='Refreshing BCH Balance'
            body={modalBody}
            hideSpinner={hideSpinner}
          />
        )}
      </>
    </>
  )
}

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/balance-card.js`:

```js
/*
  This card displays the users balance in  BCH.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons'

const BalanceCard = (props) => {
  const { appData } = props

  const bchjs = appData.wallet.bchjs
  const sats = appData.bchWalletState.bchBalance
  const bchBalance = bchjs.BitcoinCash.toBitcoinCash(sats)
  const usdBalance = bchjs.Util.floor2(bchBalance * appData.bchWalletState.bchUsdPrice)

  return (
    <>
      <Card>
        <Card.Body>
          <Card.Title style={{ textAlign: 'center' }}>
            <h2><FontAwesomeIcon icon={faCoins} size='lg' /> Balance</h2>
          </Card.Title>
          <br />

          <Container>
            <Row>
              <Col>
                <b>USD</b>: ${usdBalance}
              </Col>
            </Row>

            <Row>
              <Col>
                <b>BCH</b>: {bchBalance}
              </Col>
            </Row>

            <Row>
              <Col>
                <b>Satoshis</b>: {sats}
              </Col>
            </Row>
          </Container>
        </Card.Body>
      </Card>
    </>
  )
}

export default BalanceCard

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/receive-card.js`:

```js
/*
  This card displays the users BCH and SLP address and QR code
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Card, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'
import { QRCodeSVG } from 'qrcode.react'

const ReceiveCard = ({ appData }) => {
  const [addrSwitch, setAddrSwitch] = useState(false)
  const [displayCopyMsg, setDisplayCopyMsg] = useState(false)

  // Determine which address to display
  const addrToDisplay = !addrSwitch
    ? appData.bchWalletState.cashAddress
    : appData.bchWalletState.slpAddress

  // Copy the selected address to the clipboard when the QR image is clicked
  const handleCopyAddress = async (value) => {
    appData.appUtil.copyToClipboard(value)

    // Display the copied message
    setDisplayCopyMsg(true)

    // Clear the copied message after some time
    setTimeout(() => {
      setDisplayCopyMsg(false)
    }, 1000)
  }

  // Event handler for address switch toggle
  const handleAddrSwitchToggle = (event) => {
    setAddrSwitch(event.target.checked)
  }

  return (
    <>
      <Card>
        <Card.Body style={{ textAlign: 'center' }}>
          <Card.Title>
            <h2><FontAwesomeIcon icon={faWallet} size='lg' /> Receive</h2>
          </Card.Title>
          <br />

          <Container>
            <Row>
              <Col style={{ color: 'green', marginBottom: '20px' }}>
                {displayCopyMsg ? 'Copied' : null}
              </Col>
            </Row>

            <Row>
              <Col>
                <QRCodeSVG
                  style={{ cursor: 'pointer' }}
                  className='qr-code'
                  value={addrToDisplay}
                  size={256}
                  fgColor='#333'
                  onClick={() => { handleCopyAddress(addrToDisplay) }}
                />
              </Col>
            </Row>
            <Row>
              <Col style={{ marginTop: '20px' }}>
                <p>{addrToDisplay}</p>
              </Col>
            </Row>

            <Row>
              <Col xs={4} />
              <Col xs={4}>
                <Form>
                  <Form.Check
                    type='switch'
                    id='address-switch'
                    onChange={e => handleAddrSwitchToggle(e)}
                  />
                </Form>
              </Col>
              <Col xs={4} />
            </Row>
          </Container>
        </Card.Body>
      </Card>
    </>
  )
}

export default ReceiveCard

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-send/refresh-bch-balance-button.js`:

```js
/*
  This component is displayed as a button. When clicked, it loads the
  RefreshBchBalance component, which renders a waiting modal while the wallet
  balance is refreshed.
*/

// Global npm libraries
import React, { useRef } from 'react'
import { Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import RefreshBchBalance from './refresh-balance'

function RefreshBchBalanceButton (props) {
  // Dependency injections of props
  const appData = props.appData

  // Child function references
  const refreshBchBalanceRef = useRef()

  // Update the balance of the wallet.
  async function handleButtonRefreshBalance (appData) {
    // Call the child function
    refreshBchBalanceRef.current.handleRefreshBalance(appData)
  }

  return (
    <>
      <Button variant='success' onClick={() => { handleButtonRefreshBalance(appData) }}>
        <FontAwesomeIcon icon={faRedo} size='lg' /> Refresh
      </Button>

      <RefreshBchBalance appData={appData} ref={refreshBchBalanceRef} />
    </>
  )
}

export default RefreshBchBalanceButton

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/configuration/index.js`:

```js
/*
 This component is a View that allows the user to handle configuration
 settings for the app.
*/

// Global npm libraries
import React from 'react'
import ServerSelectView from './select-server-view'

function ConfigurationView (props) {
  const { appData } = props

  return (
    <>
      <ServerSelectView appData={appData} />
    </>
  )
}

export default ConfigurationView

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/configuration/select-server-button.js`:

```js
/*
  This component contains a drop-down form that lets the user select from
  a range of Global Back End servers.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

const ServerSelect = (props) => {
  const { linkTo, appData } = props

  // Use the navigate function to navigate to the servers view
  const navigate = useNavigate()

  // This is a click handler for the server select button. It brings up the
  // server selection View.
  const handleServerSelect = () => {
    console.log('This function should navigate to the server selection view.')
    navigate(linkTo)
  }

  return (
    <Container>
      <>
        <hr />
        <Row>
          <Col style={{ textAlign: 'center', padding: '25px' }}>
            <br />
            <h5>
              Having trouble loading? Try selecting a different back-end server.
            </h5>
            <p style={{ fontStyle: 'italic' }}>Current Server : {appData.serverUrl}</p>
            <Button variant='warning' onClick={handleServerSelect}>
              Select a different back end server
            </Button>
            <br />
          </Col>

        </Row>
      </>
    </Container>
  )
}

export default ServerSelect

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/configuration/select-server-view.js`:

```js
/*
  This component is a View that allows the user to select a back end server
  from a list of servers.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Row, Col, Form, Card } from 'react-bootstrap'

function ServerSelectView (props) {
  const { appData } = props
  const [selectedServer, setSelectedServer] = useState(appData.serverUrl)
  const servers = appData.servers

  // Update server when dropdown selection changes
  const handleServerChange = (event) => {
    setSelectedServer(event.target.value)
  }

  const onSaveServer = (serverUrl) => {
    console.log('server target: ', serverUrl)
    appData.updateLocalStorage({ serverUrl })
    window.location.href = '/'
  }

  return (
    <>
      <Card className='m-3'>
        <Row className='mb-3 mt-3 mx-3'>
          <Col className='text-end'>
            <button
              className='btn btn-primary'
              style={{ minWidth: '100px' }}
              onClick={() => onSaveServer(selectedServer)}
            >
              Save
            </button>
          </Col>
        </Row>

        <Card.Body>
          <Row>
            <Col style={{ textAlign: 'center' }}>
              <h2>Configuration</h2>
              <p>
                This page allows you to change configuration settings for different
                back end services. This page is for advanced users only.
              </p>
            </Col>
          </Row>
          <hr />

          <Row className='justify-content-center'>
            <Col xs={12} md={6}>
              <p>
                Select an alternative server below. The app will reload and use
                the selected server.
              </p>
              <Form.Select
                value={selectedServer}
                onChange={handleServerChange}
                className='mb-3'
              >
                {servers.map((server, i) => (
                  <option key={`server-${i}`} value={server.value}>
                    {server.value === appData.serverUrl ? `${server.label} (current)` : server.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Row className='justify-content-center mt-3'>
            <Col xs={12} md={6} className='text-center'>
              <button
                className='btn btn-primary'
                style={{ minWidth: '100px' }}
                onClick={() => onSaveServer(selectedServer)}
              >
                Save
              </button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  )
}

export default ServerSelectView

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/sign/index.js`:

```js
/*
Component for signing a message with a WIF private key.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function SignMessage (props) {
  // Convert class state to hooks
  const { wallet, appUtil } = props.appData

  const [sign, setSign] = useState('')
  const [msg, setMsg] = useState('')
  const [bchAddr] = useState(wallet.walletInfo.cashAddress)
  const [slpAddr] = useState(wallet.walletInfo.slpAddress)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSignMessage = (event) => {
    try {
      event.preventDefault()

      if (!msg) throw new Error('Enter a message to sign.')

      const bchjs = wallet.bchjs

      const wif = props.appData.wallet.walletInfo.privateKey
      const sig = bchjs.BitcoinCash.signMessageWithPrivKey(wif, msg)

      setSign(sig)
      setErr('')
    } catch (err) {
      console.log('Error in handleSignMessage(): ', err)
      setErr(err.message)
      setSign('')
    }
  }

  // Function to copy the value to the clipboard.
  const handleCopyToClipboard = async (value) => {
    appUtil.copyToClipboard(value)

    // show the copied message
    setCopied(true)

    // hide copied message after 1 second
    setTimeout(function () {
      setCopied(false)
    }, 1000)
  }

  const copyIcon = (value) => {
    return <FontAwesomeIcon icon={faCopy} size='lg' onClick={() => handleCopyToClipboard(value)} style={{ cursor: 'pointer', marginLeft: '10px' }} />
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <p>
              This view allows you cryptographically sign a message with your
              wallet. These signatures are used in a wide range of applications,
              such as gaining access to
              the <a href='https://t.me/psf_vip' target='_blank' rel='noreferrer'>PSF VIP Telegram channel</a>.
            </p>
            <p>
              Enter any message into the form below and click the button. This
              view will generate a cryptographic signature.
            </p>
          </Col>
        </Row>
        <Row>
          <Col className='text-break'>
            <Form onSubmit={handleSignMessage}>
              <Form.Group className='mb-3' controlId='message'>
                <Form.Label><b>Enter a message to sign.</b></Form.Label>
                <Form.Control type='text' placeholder='' onChange={e => setMsg(e.target.value)} />
              </Form.Group>
              {err && <p style={{ color: 'red', marginBottom: '10px' }}>{`Error: ${err}`}</p>}

              <Button variant='primary' onClick={handleSignMessage}>
                Sign Message
              </Button>
            </Form>
          </Col>
        </Row>
        <br />
        {sign && (
          <div style={{ textAlign: 'center' }}>
            <Row>
              <Col>
                <p>
                  <b>Signature:</b> {sign} {copyIcon(sign)}
                </p>
                <p>
                  <b>BCH Address:</b> {bchAddr} {copyIcon(bchAddr)}
                </p>
                <p>
                  <b>SLP Address:</b> {slpAddr} {copyIcon(slpAddr)}
                </p>
              </Col>

            </Row>
            {copied && (
              <span style={{ color: 'green' }}>
                Copied!
              </span>
            )}
          </div>
        )}
      </Container>
    </>
  )
}

export default SignMessage

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/slp-tokens/send-token-button.js`:

```js
/*
  This component renders as a button. When clicked, it opens up a modal
  for sending a quantity of tokens.
  This component requires state, because it's a complex form that is being manipulated
  by the user.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Button, Modal, Container, Row, Col, Form, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaste } from '@fortawesome/free-solid-svg-icons'

function SendTokenButton ({ token, appData, refreshTokens }) {
  // Convert class state to useState hooks
  const [showAddrWarning, setShowAddrWarning] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [hideSpinner, setHideSpinner] = useState(true)
  const [shouldRefreshOnModalClose, setShouldRefreshOnModalClose] = useState(false)
  const [sendToAddress, setSendToAddress] = useState('')
  const [sendQtyStr, setSendQtyStr] = useState('')
  const [dialogFinished, setDialogFinished] = useState(true)

  // Handler functions
  const handleShowModal = () => setShowModal(true)

  const handleCloseModal = async () => {
    if (!dialogFinished) return

    if (shouldRefreshOnModalClose) {
      setShowModal(false)
      setShouldRefreshOnModalClose(false)
      setStatusMsg('')
      await refreshTokens()
    } else {
      setShowModal(false)
      setStatusMsg('')
      setSendToAddress('')
      setSendQtyStr('')
    }
  }
  const handleUpdateSendToAddr = (event) => {
    const value = event.target.value
    setSendToAddress(value)
    setShowAddrWarning(value.includes('bitcoincash'))
  }
  const handleGetMax = () => {
    setSendQtyStr(token.qty)
  }

  // Click handler that fires when the user clicks the 'Send' button.

  const handleSendTokens = async (e) => {
    e.preventDefault()
    try {
      setStatusMsg('Preparing to send tokens...')
      setHideSpinner(false)
      setDialogFinished(false)
      setShowAddrWarning(false)

      // Validate the quantity
      const qty = parseFloat(sendQtyStr)
      if (isNaN(qty)) throw new Error('Invalid send quantity')

      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // Validate the address
      let addr = sendToAddress
      if (addr.includes('simpleledger')) {
        addr = bchjs.SLP.Address.toCashAddress(addr)
      }
      if (!addr.includes('bitcoincash')) throw new Error('Invalid address')

      let infoStr = 'Updating UTXOs...'

      setStatusMsg(infoStr)
      await wallet.getUtxos()

      const receiver = [{
        address: addr,
        tokenId: token.tokenId,
        qty
      }]

      infoStr = 'Generating and broadcasting transaction...'
      setStatusMsg(infoStr)

      const txid = await wallet.sendTokens(receiver, 3)
      console.log(`Token sent. TXID: ${txid}`)

      setStatusMsg(<p>Success! <a href={`https://token.fullstack.cash/transactions/?txid=${txid}`} target='_blank' rel='noreferrer'>See on Block Explorer</a></p>)
      setHideSpinner(true)
      setSendQtyStr('')
      setSendToAddress('')
      setShouldRefreshOnModalClose(true)
      setDialogFinished(true)
    } catch (err) {
      console.error('Error in handleSendTokens(): ', err)
      setStatusMsg(`Error sending tokens: ${err.message}`)
      setHideSpinner(true)
      setDialogFinished(true)
    }
  }

  // Load address from clipboard
  const pasteFromClipboard = async () => {
    try {
      const address = await appData.appUtil.readFromClipboard()
      setSendToAddress(address)
    } catch (err) {
      console.warn('Error pasting from clipboard: ', err)
    }
  }

  // Modal JSX
  const getModal = () => {
    return (
      <Modal show={showModal} size='lg' onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title><FontAwesomeIcon icon={faPaperPlane} size='lg' /> Send Tokens: <span style={{ color: 'red' }}>{token.ticker}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            {/* ... existing Modal.Body content ... */}
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>SLP Address:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={10}>
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='text'
                      placeholder='simpleledger:qqlrzp23w08434twmvr4fxw672whkjy0pyxpgpyg0n'
                      onChange={handleUpdateSendToAddr}
                      value={sendToAddress}
                    />
                  </Form.Group>
                </Form>
              </Col>

              <Col xs={2}>
                <FontAwesomeIcon
                  style={{ cursor: 'pointer' }}
                  icon={faPaste}
                  size='lg'
                  onClick={pasteFromClipboard}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col style={{ textAlign: 'center' }}>
                <b>Amount:</b>
              </Col>
            </Row>

            <Row>
              <Col xs={10}>
                <Form style={{ paddingBottom: '10px' }} onSubmit={handleSendTokens}>
                  <Form.Group controlId='formBasicEmail' style={{ textAlign: 'center' }}>
                    <Form.Control
                      type='text'
                      onChange={e => setSendQtyStr(e.target.value)}
                      value={sendQtyStr}
                    />
                  </Form.Group>
                </Form>
              </Col>

              <Col xs={2}>
                <Button onClick={handleGetMax}>Max</Button>
              </Col>
            </Row>
            <br />

            <Row>
              <Col style={{ textAlign: 'center' }}>
                <Button onClick={handleSendTokens}>Send</Button>
              </Col>
            </Row>
            <br />

            {showAddrWarning && (
              <>
                <Row>
                  <Col style={{ textAlign: 'center' }}>
                    <p style={{ color: 'orange' }}>
                      <b>Warning</b>: Careful! Not all Bitcoin Cash wallets are token-aware.
                      If you send this token to a wallet that is not
                      token-aware, it could be burned. It's best practice to
                      only send tokens to 'simpleledger' addresses and not
                      'bitcoincash' addresses.
                    </p>
                  </Col>
                </Row>
                <br />
              </>
            )}
            <Row>
              <Col xs={10}>
                {statusMsg}
              </Col>

              <Col xs={2}>
                {!hideSpinner && <Spinner animation='border' />}
              </Col>
            </Row>

          </Container>
        </Modal.Body>
        <Modal.Footer />
      </Modal>
    )
  }

  return (
    <>
      <Button variant='info' onClick={handleShowModal}>Send</Button>
      {showModal && getModal()}
    </>
  )
}

export default SendTokenButton

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/slp-tokens/index.js`:

```js
/*
  This is the 'Token View'. It displays the SLP tokens in the wallet.
*/

// Global npm libraries
import React, { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import TokenCard from './token-card'
import RefreshTokenBalance from './refresh-tokens'

const SlpTokens = (props) => {
  const [appData, setAppData] = useState(props.appData)
  const [iconsAreLoaded, setIconsAreLoaded] = useState(false)
  const [tokens, setTokens] = useState([])

  const refreshTokenButtonRef = React.useRef()

  // Update the tokens state when the appData changes
  useEffect(() => {
    setTokens(appData.bchWalletState.slpTokens)
  }, [appData])

  // This function is triggered when the token balance needs to be refreshed
  // from the blockchain.
  // This needs to happen after sending a token, to reflect the changed balance
  // within the wallet app.
  // This function triggers the on-click function within the refresh-tokens.js button.
  const refreshTokens = async () => {
    const newAppData = await refreshTokenButtonRef.current.handleRefreshTokenBalance()
    setAppData(newAppData)
  }

  // Get Cid from url
  const parseCid = (url) => {
    // get the cid from the url format 'ipfs://bafybeicem27xbzs65uvbcgykcmscsgln3lmhbfrcoec3gdttkdgtxv5acq
    if (url && url.includes('ipfs://')) {
      const cid = url.split('ipfs://')[1]
      return cid
    }
    return url
  }

  // Fetch mutable data if it exist and get the token icon url
  const fetchTokenIcon = useCallback(async (token) => {
    try {
      // Get the token data
      const tokenData = await appData.wallet.getTokenData(token.tokenId)
      if (!tokenData.mutableData) return false // Return false if no mutable data
      // Get the token icon from the mutable data
      const cid = parseCid(tokenData.mutableData)
      console.log('mutable data cid', cid)

      const { json } = await appData.wallet.cid2json({ cid })

      if (!json) return false

      const iconUrl = json.tokenIcon
      // Return icon url
      return iconUrl
    } catch (error) {
      return false
    }
  }, [appData])

  //  This function loads the token icons from the ipfs gateways.
  const lazyLoadTokenIcons = useCallback(async () => {
    try {
      setIconsAreLoaded(false)

      const tokens = appData.bchWalletState.slpTokens

      setTokens(tokens) // update token state

      // map each token and fetch the icon url
      for (let i = 0; i < tokens.length; i++) {
        const thisToken = tokens[i]

        // Incon does not  need to be downloaded, so continue with the next one
        if (thisToken.iconAlreadyDownloaded) continue

        // Try to get token icon url from mutable data.
        const iconUrl = await fetchTokenIcon(thisToken)
        console.log('iconUrl', iconUrl)
        if (iconUrl) {
          // Set the icon url to the token , this can be used to display the icon in the token card component.
          thisToken.icon = iconUrl
        }

        // Mark token to prevent fetch token icon again.
        thisToken.iconAlreadyDownloaded = true
      }

      appData.updateBchWalletState({ walletObj: { slpTokens: tokens }, appData })
      setIconsAreLoaded(true)
    } catch (error) {
      setIconsAreLoaded(true)
    }
  }, [appData, fetchTokenIcon])

  // Start to load the token icons when the component is mounted
  useEffect(() => {
    lazyLoadTokenIcons()
  }, [lazyLoadTokenIcons])

  // Generate the token cards for each token in the wallet.
  const generateCards = () => {
    const tokens = appData.bchWalletState.slpTokens
    return tokens.map(thisToken => (
      <TokenCard
        appData={appData}
        token={thisToken}
        key={`${thisToken.tokenId}`}
        refreshTokens={refreshTokens}
      />
    ))
  }

  return (
    <>
      <Container>
        <Row>
          <Col xs={6}>
            <RefreshTokenBalance
              appData={appData}
              ref={refreshTokenButtonRef}
              lazyLoadTokenIcons={lazyLoadTokenIcons}
            />
          </Col>
          <Col xs={6} style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/f1no5-QHTr4' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>
        <Row>
          <Col xs={12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {
              !iconsAreLoaded && (
                <div style={{ borderRadius: '10px', backgroundColor: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 'fit-content' }}>
                  <span style={{ marginRight: '10px' }}>Loading Token Icons </span>
                  <Spinner animation='border' />
                </div>
              )
            }

          </Col>
        </Row>
        <br />

        <Row>
          {generateCards()}
        </Row>
        {/** Display a message if no tokens are found */}
        {tokens.length === 0 && (
          <Row className='text-center'>
            <span> No tokens found in wallet </span>
          </Row>
        )}

      </Container>
    </>
  )
}

export default SlpTokens

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/slp-tokens/info-button.js`:

```js
/*
  This component renders as a button. When clicked, it opens a modal that
  displays information about the token.

  This is a functional component with as little state as possible.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Button, Modal, Container, Row, Col } from 'react-bootstrap'

// Takes a string as input. If it matches a pattern for a link, a JSX object is
// returned with a link. Otherwise the original string is returned.
function linkIfUrl (url) {
  // Convert the URL into a link if it contains 'http'
  if (url.includes('http')) {
    url = (<a href={url} target='_blank' rel='noreferrer'>{url}</a>)

    //
  } else if (url.includes('ipfs://')) {
    // Convert to a Filecoin link if its an IPFS reference.

    const cid = url.substring(7)
    url = (<a href={`https://${cid}.ipfs.dweb.link/data.json`} target='_blank' rel='noreferrer'>{url}</a>)
  }

  return url
}

function InfoButton (props) {
  const [show, setShow] = useState(false)

  const handleClose = () => {
    setShow(false)
    // props.instance.setState({ showModal: false })
  }

  const handleOpen = () => {
    setShow(true)
  }

  // Convert the url property of the token to a link, if it matches common patterns.
  let url = props.token.url
  url = linkIfUrl(props.token.url)

  // console.log('props.token: ', props.token)

  return (
    <>
      <Button variant='info' onClick={handleOpen}>Info</Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Token Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Row>
              <Col xs={4}><b>Ticker</b>:</Col>
              <Col xs={8}>{props.token.ticker}</Col>
            </Row>

            <Row style={{ backgroundColor: '#eee' }}>
              <Col xs={4}><b>Name</b>:</Col>
              <Col xs={8}>{props.token.name}</Col>
            </Row>

            <Row>
              <Col xs={4}><b>Token ID</b>:</Col>
              <Col xs={8} style={{ wordBreak: 'break-all' }}>
                <a href={`https://token.fullstack.cash/?tokenid=${props.token.tokenId}`} target='_blank' rel='noreferrer'>
                  {props.token.tokenId}
                </a>
              </Col>
            </Row>

            <Row style={{ backgroundColor: '#eee' }}>
              <Col xs={4}><b>Decimals</b>:</Col>
              <Col xs={8}>{props.token.decimals}</Col>
            </Row>

            <Row>
              <Col xs={4}><b>Token Type</b>:</Col>
              <Col xs={8}>{props.token.tokenType}</Col>
            </Row>

            <Row style={{ backgroundColor: '#eee', wordBreak: 'break-all' }}>
              <Col xs={4}><b>URL</b>:</Col>
              <Col xs={8}>{url}</Col>
            </Row>
          </Container>
        </Modal.Body>
        <Modal.Footer />
      </Modal>
    </>
  )
}

export default InfoButton

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/slp-tokens/token-card.js`:

```js
/*
  This Card component summarizes an SLP token.
  if a token icon does not exist or cant be loaded , then display a default icon from Jdenticon library.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import Jdenticon from '@chris.troutner/react-jdenticon'
// Local libraries
import InfoButton from './info-button'
import SendTokenButton from './send-token-button'

function TokenCard (props) {
  const { token } = props
  const [icon, setIcon] = useState(token.icon)

  // Update icon state every token.icon changes
  useEffect(() => {
    setIcon(token.icon)
  }, [token.icon])

  return (
    <>
      <Col xs={12} sm={6} lg={4} style={{ padding: '25px' }}>
        <Card>
          <Card.Body style={{ textAlign: 'center' }}>
            {/** If the icon is loaded, display it */
              icon && (
                <Card.Img
                  src={icon}
                  style={{ height: '100px', width: 'auto' }}
                  onError={(e) => {
                    setIcon(null) // Set the icon to null if it fails to load the image url.
                  }}
                />
              )
            }

            {/** If the icon is not loaded, display the Jdenticon   */
              !icon && (
                <Jdenticon size='100' value={token.tokenId} />
              )
            }
            <Card.Title style={{ textAlign: 'center' }}>
              <h4>{props.token.ticker}</h4>
            </Card.Title>

            <Container>
              <Row>
                <Col>
                  {props.token.name}
                </Col>
              </Row>
              <br />

              <Row>
                <Col>Balance:</Col>
                <Col>{props.token.qty}</Col>
              </Row>
              <br />

              <Row>
                <Col>
                  <InfoButton token={props.token} />
                </Col>
                <Col>
                  <SendTokenButton
                    token={props.token}
                    appData={props.appData}
                    refreshTokens={props.refreshTokens}
                  />
                </Col>
              </Row>
            </Container>
          </Card.Body>
        </Card>
      </Col>
    </>
  )
}

export default TokenCard

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/slp-tokens/refresh-tokens.js`:

```js
/*
  This component is displayed as a button. When clicked, it displays a modal
  with a spinny gif, while the wallets SLP token list is updated from the
  blockchain and psf-slp-indexer.
*/

// Global npm libraries
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRedo } from '@fortawesome/free-solid-svg-icons'

// Local libraries
import WaitingModal from '../../waiting-modal'

function RefreshTokenBalance ({ appData: initialAppData, ref, lazyLoadTokenIcons }) {
  const [appData, setAppData] = useState(initialAppData)
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [hideWaitingModal, setHideWaitingModal] = useState(true)

  // Add a new line to the waiting modal.
  const addToModal = (inStr) => {
    setModalBody(prevBody => [...prevBody, inStr])
  }

  // Update the balance of the wallet.
  const handleRefreshTokenBalance = useCallback(async () => {
    try {
      // Throw up the waiting modal
      setHideWaitingModal(false)
      addToModal('Updating token balance...')

      // Get handles on app data.
      const walletState = appData.bchWalletState
      const wallet = appData.wallet

      // Update the wallet UTXOs
      await wallet.initialize()
      const tokenList = await wallet.listTokens()

      // Copy tokens from old token state.
      for (let i = 0; i < tokenList.length; i++) {
        const thisToken = tokenList[i]

        // Look through the existing wallet state for the matching token.
        const existingToken = walletState.slpTokens.filter(x => x.tokenId === thisToken.tokenId)

        // If the current wallet state has an icon, copy it over.
        if (existingToken[0] && existingToken[0].icon) {
          thisToken.icon = existingToken[0].icon
        }
      }

      // Update the wallet state.
      walletState.slpTokens = tokenList

      appData.updateBchWalletState({ walletObj: walletState, appData })

      const newAppData = { ...appData, bchWalletState: walletState }
      // Update state
      setHideWaitingModal(true)
      setAppData(newAppData)
      setModalBody([])

      // Lazy load icons for any new tokens.
      await lazyLoadTokenIcons()

      return newAppData
    } catch (err) {
      console.error('Error while trying to update BCH balance: ', err)
      setModalBody([`Error: ${err.message}`])
      setHideSpinner(true)
    }
  }, [appData, lazyLoadTokenIcons])

  // add a ref to the handleRefreshBalance function
  // This is used to call the function from the parent component.
  useEffect(() => {
    if (ref && !ref.current) ref.current = { handleRefreshTokenBalance }
  }, [ref, handleRefreshTokenBalance])

  return (
    <>
      <Button variant='success' onClick={handleRefreshTokenBalance}>
        <FontAwesomeIcon icon={faRedo} size='lg' /> Refresh
      </Button>

      {!hideWaitingModal && (
        <WaitingModal
          heading='Refreshing Token List'
          body={modalBody}
          hideSpinner={hideSpinner}
        />
      )}
    </>
  )
}

export default RefreshTokenBalance

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/placeholder2.js`:

```js
/*
  This is a placeholder View
*/

// Global npm libraries
import React, { useEffect } from 'react'

function Placeholder2 (props) {
  useEffect(() => {
    console.log('Placeholder 2 loaded.')
  }, [])

  return (
    <>
      <p style={{ padding: '25px' }}>This is placeholder View #2</p>
    </>
  )
}

export default Placeholder2

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/optimize-wallet.js`:

```js
/*
  This component allows the user to optimize their wallet by consolidating
  UTXOs. This speeds up all the network calls and results in an improved UX.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'

// Local libraries
import WaitingModal from '../../waiting-modal'

function OptimizeWallet (props) {
  // State
  const [showModal, setShowModal] = useState(false)
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [denyClose, setDenyClose] = useState(false)

  // Get props values
  const { wallet } = props.appData

  // Optimize wallet
  const handleOptimize = async () => {
    console.log('Optimize Wallet button clicked.')
    // Show waiting modal
    setShowModal(true)
    setModalBody(['Optimizing wallet...'])
    setDenyClose(true)

    // Optimize wallet
    await wallet.optimize()

    // Show success modal
    setShowModal(true)
    setModalBody(['Your wallet has been optimized!'])
    setDenyClose(false)
    setHideSpinner(true)

    try {
      // Get all UTXOs in the wallet
      const utxos = wallet.utxos.utxoStore
      console.log('utxos: ', utxos)

      // Add up all the UTXOs
      const bchUtxoCnt = utxos.bchUtxos.length
      let fungibleUtxoCnt = utxos.slpUtxos.type1.tokens.length
      if (!fungibleUtxoCnt) fungibleUtxoCnt = 0
      let nftUtxoCnt = utxos.slpUtxos.nft.length
      if (!nftUtxoCnt) nftUtxoCnt = 0
      const totalUtxos = bchUtxoCnt + fungibleUtxoCnt + nftUtxoCnt
      console.log(`bchUtxoCnt: ${bchUtxoCnt}, fungibleUtxoCnt: ${fungibleUtxoCnt}, nftUtxoCnt: ${nftUtxoCnt}`)
      console.log(`total UTXO count: ${totalUtxos}`)

      if (totalUtxos > 10) {
        const newModalBody = [
          'Your wallet has been optimized!',
          'Your wallet still has more than 10 UTXOs. Increased numbers of UTXOs slow down performance. If you have several tokens in your wallet, it is recommended that you store them in a paper wallet. Here is a video explaining how to do that:'
        ]

        newModalBody.push(<a href='https://youtu.be/mRniqpgWdjg' target='_blank' rel='noreferrer'>Video: How to Store SLP Tokens on a Paper Wallet</a>)
        newModalBody.push(<a href='https://paperwallet.fullstack.cash/' target='_blank' rel='noreferrer'>Generate a Paper Wallet</a>)

        setModalBody(newModalBody)
      }
    } catch (err) {
      console.log('Error while trying to count total number of UTXOs: ', err)
    }
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>Optimize Wallet</h2>
                </Card.Title>
                <Card.Text style={{ textAlign: 'center' }}>

                  Clicking the button below will optimize your wallet and make it
                  function faster.
                  <br /><br />
                  <i>How it works</i>: By consolidating
                  as many UTXOs in your wallet as possible, it reduces the total
                  number of UTXOs in your wallet. Fewer UTXOs in your wallet make
                  all network calls faster, and results in an improved user experience.
                  <br /><br />
                  <Button variant='primary' onClick={handleOptimize}>
                    Optimize Wallet
                  </Button>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {showModal && (
        <WaitingModal
          heading='Optimizing Wallet'
          body={modalBody}
          hideSpinner={hideSpinner}
          denyClose={denyClose}
        />
      )}
    </>
  )
}

export default OptimizeWallet

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/index.js`:

```js
/*
  This component controlls the Wallet View.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'

// Local Libraries
import WebWalletWarning from './warning'
import WalletSummary from './wallet-summary'
import WalletClear from './clear-wallet'
import WalletImport from './import-wallet'
import OptimizeWallet from './optimize-wallet'

function BchWallet (props) {
  // Dependency injection through props
  const appData = props.appData
  console.log('appData: ', appData)

  return (
    <>
      <Container>
        <Row>
          <Col style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/0R00cppN0fA' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>
      </Container>
      <WebWalletWarning />
      <br />
      <WalletSummary appData={appData} />
      <br />
      <WalletClear appData={appData} />
      <br />
      <WalletImport appData={appData} />
      <br />
      <OptimizeWallet appData={appData} />
    </>
  )
}

export default BchWallet

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/clear-wallet.js`:

```js
/*
This Card component is used to clear the Local Storage and reset the wallet.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

const WalletClear = (props) => {
  const { removeLocalStorageItem } = props.appData

  // Delete wallet data from Local Storage and reload the app.
  const handleClearLocalStorage = () => {
    console.log('Deleting wallet and reloading page.')
    // Delete the mnemonic from Local Storage
    removeLocalStorageItem('mnemonic')
    // Reload the app.
    window.location.reload()
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                    <span>Clear Local Storage</span>
                  </h2>
                </Card.Title>

                <Card.Text style={{ textAlign: 'center' }}>
                  Clicking the button below will clear the Local Storage, which
                  will reload the app with a newly created wallet.
                  <br />
                  <b>
                    Be sure to write down your 12-word mnemonic to back
                    up your wallet before clicking the button!
                  </b>.
                  <br /><br />
                  <Button variant='danger' onClick={handleClearLocalStorage}>
                    Delete Wallet
                  </Button>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WalletClear

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/wallet-summary.css`:

```css
.blurred {
    filter: blur(6px);
    -webkit-filter: blur(6px);
}

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/import-wallet.js`:

```js
/*
  This component allows the user to import a new wallet using a 12-word mnemonic.
*/

// Global npm libraries
import React, { useCallback } from 'react'
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileExport, faPaste } from '@fortawesome/free-solid-svg-icons'
// import { Clipboard } from '@capacitor/clipboard'

const WalletImport = (props) => {
  const [newMnemonic, setNewMnemonic] = React.useState('')
  const { appData } = props

  // Load mnemonic from clipboard
  const pasteFromClipboard = async () => {
    try {
      const mnemonic = await appData.appUtil.readFromClipboard()
      setNewMnemonic(mnemonic)
    } catch (err) {
      console.warn('Error pasting from clipboard: ', err)
    }
  }

  // Handle input change for mnemonic
  const handleImportMnemonic = async (event) => {
    const inputStr = event.target.value
    const formattedInput = inputStr.toLowerCase()
    setNewMnemonic(formattedInput)
  }

  // Ensure the mnemonic is valid. If it is, then replace the current mnemonic
  // in LocalStorage and reload the page.
  const handleImportWallet = useCallback(async (event) => {
    try {
      const mnemonic = newMnemonic
      const wallet = appData.wallet
      const bchjs = wallet.bchjs

      // Verify the mnemonic is valid.
      const isValid = bchjs.Mnemonic.validate(mnemonic, bchjs.Mnemonic.wordLists().english)
      if (isValid.includes('is not in wordlist')) {
        console.log('Mnemonic is NOT valid')
      } else {
        console.log('Mnemonic is valid')
      }

      // Replace the old mnemonic in LocalStorage with the new one.
      appData.updateLocalStorage({ mnemonic })
      // Reload the app.
      window.location.reload()
    } catch (error) {
      console.warn('Error importing wallet: ', error)
    }
  }, [newMnemonic, appData])

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faFileExport} />{' '}
                    <span>Import Wallet</span>
                  </h2>
                </Card.Title>

                <Card.Text style={{ textAlign: 'center' }}>
                  Enter a 12 word mnemonic below to import your wallet into
                  this app. The app will reload and use the new mnemonic.
                </Card.Text>

                <Container>
                  <Row>
                    <Col xs={12} className='text-break' style={{ textAlign: 'center' }}>
                      <Form onSubmit={(e) => e.preventDefault()}>
                        <Form.Group className='mb-3' controlId='formImportWallet' style={{ display: 'flex', alignItems: 'center' }}>
                          <Form.Control
                            style={{ margin: '1rem' }}
                            type='text'
                            value={newMnemonic}
                            onChange={handleImportMnemonic}
                          />
                          <FontAwesomeIcon
                            icon={faPaste}
                            size='lg'
                            onClick={(e) => pasteFromClipboard(e)}
                            style={{ cursor: 'pointer' }}
                          />
                        </Form.Group>
                      </Form>
                    </Col>
                  </Row>

                  <Row>
                    <Col style={{ textAlign: 'center' }}>
                      <Button variant='primary' onClick={handleImportWallet}>
                        Import
                      </Button>
                    </Col>
                  </Row>

                  <br />
                </Container>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WalletImport

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/wallet-summary.js`:

```js
/*
  This component displays a summary of the wallet.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
// import { Clipboard } from '@capacitor/clipboard'

// Local libraries
import './wallet-summary.css'
import CopyOnClick from './copy-on-click'

function WalletSummary (props) {
  // Props
  const appData = props.appData

  const bchWalletState = appData.bchWalletState
  console.log('wallet summary state: ', bchWalletState)

  // State
  const [blurredMnemonic, setBlurredMnemonic] = useState(true)
  const [blurredPrivateKey, setBlurredPrivateKey] = useState(true)

  // Encapsulate component state into an object that can be passed to child functions
  const walletSummaryData = {
    blurredMnemonic,
    setBlurredMnemonic,
    blurredPrivateKey,
    setBlurredPrivateKey
  }

  // Eye icon state
  const eyeIcon = {
    mnemonic: blurredMnemonic ? faEyeSlash : faEye,
    privateKey: blurredPrivateKey ? faEyeSlash : faEye
  }

  // Toggle the state of blurring for the mnemonic
  const toggleMnemonicBlur = (inObj = {}) => {
    try {
      const { walletSummaryData } = inObj

      // toggle the state of blurring
      const blurredState = walletSummaryData.blurredMnemonic
      walletSummaryData.setBlurredMnemonic(!blurredState)
    } catch (error) {
      console.error('Error toggling mnemonic blur: ', error)
    }
  }

  // Toggle the state of blurring for the private key
  const togglePrivateKeyBlur = (inObj = {}) => {
    try {
      const { walletSummaryData } = inObj

      // toggle the state of blurring
      const blurredState = walletSummaryData.blurredPrivateKey
      walletSummaryData.setBlurredPrivateKey(!blurredState)
    } catch (error) {
      console.error('Error toggling private key blur: ', error)
    }
  }

  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faWallet} />{' '}
                    <span>My Wallet</span>
                  </h2>
                </Card.Title>
                <Container>
                  <Row style={{ padding: '25px' }}>
                    <Col xs={12} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>Mnemonic:</b> <span className={blurredMnemonic ? 'blurred' : null}>{bchWalletState.mnemonic}</span>
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <FontAwesomeIcon
                        style={{ cursor: 'pointer' }}
                        icon={eyeIcon.mnemonic}
                        size='lg'
                        onClick={() => toggleMnemonicBlur({ walletSummaryData })}
                      />
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='mnemonic' appData={appData} value={bchWalletState.mnemonic} />
                    </Col>
                  </Row>

                  <Row style={{ padding: '25px', backgroundColor: '#eee' }}>
                    <Col xs={12} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>Private Key:</b> <span className={blurredPrivateKey ? 'blurred' : null}>{bchWalletState.privateKey}</span>
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <FontAwesomeIcon
                        style={{ cursor: 'pointer' }}
                        icon={eyeIcon.privateKey}
                        size='lg'
                        onClick={() => togglePrivateKeyBlur({ walletSummaryData })}
                      />
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='privateKey' appData={appData} value={bchWalletState.privateKey} />
                    </Col>
                  </Row>

                  <Row style={{ padding: '25px' }}>
                    <Col xs={12} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>Cash Address:</b> {bchWalletState.cashAddress}
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }} />
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='cashAddress' appData={appData} value={bchWalletState.cashAddress} />
                    </Col>
                  </Row>

                  <Row style={{ padding: '25px', backgroundColor: '#eee' }}>
                    <Col xs={12} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>SLP Address:</b> {bchWalletState.slpAddress}
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }} />
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='slpAddress' appData={appData} value={bchWalletState.slpAddress} />
                    </Col>
                  </Row>

                  <Row style={{ padding: '25px' }}>
                    <Col xs={12} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>Legacy Address:</b> {bchWalletState.legacyAddress}
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }} />
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='legacyAddress' appData={appData} value={bchWalletState.legacyAddress} />
                    </Col>
                  </Row>

                  <Row style={{ padding: '25px', backgroundColor: '#eee' }}>
                    <Col xs={10} sm={10} lg={8} style={{ padding: '10px' }}>
                      <b>HD Path:</b> {bchWalletState.hdPath}
                    </Col>
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }} />
                    <Col xs={6} sm={1} lg={2} style={{ textAlign: 'center' }}>
                      <CopyOnClick walletProp='hdPath' appData={appData} value={bchWalletState.hdPath} />
                    </Col>
                  </Row>
                </Container>
              </Card.Body>
            </Card>

          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WalletSummary

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/warning.js`:

```js
/*
  This component is a visual warning against storing large sums of money in
  a web wallet.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

const WebWalletWarning = () => {
  return (
    <>
      <Container>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title style={{ textAlign: 'center' }}>
                  <h2>
                    <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                    <span>Web Wallets are Insecure</span>
                  </h2>
                </Card.Title>

                <Card.Text style={{ textAlign: 'center' }}>
                  This is an open source, non-custodial web wallet
                  supporting Bitcoin Cash (BCH) and SLP tokens.
                  It is optimized for convenience and not security.
                  <br />
                  <b>Do not store large amounts of money on a web wallet.
                  </b>
                  <br /><br />
                  Note: Scammers frequently copy this open source code to build
                  apps for stealing people's money. Be sure you trust the source
                  serving you this app.
                </Card.Text>
              </Card.Body>
            </Card>

          </Col>
        </Row>
      </Container>
    </>
  )
}

export default WebWalletWarning

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/bch-wallet/copy-on-click.js`:

```js
/*
  This component is visually represented with a copy icon. A wallet property
  is passed as a prop. When clicked, the wallet property is copied to the
  system clipboard.
*/

// Global npm libraries
import React, { useCallback, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons'

const CopyOnClick = (props) => {
  // State
  const [iconVis, setIconVis] = useState(true)
  // Props
  const { appData, walletProp, value } = props
  // App Util
  const { appUtil } = appData

  // Function to copy the value to the clipboard.
  const handleCopyToClipboard = useCallback(async (event) => {
    appUtil.copyToClipboard(value)

    // hide icon in order to show the copied message
    setIconVis(false)

    // restart icon visibility after 1 second
    setTimeout(function () {
      setIconVis(true)
    }, 1000)
  }, [value, appUtil])

  return (
    <>
      {iconVis && (
        <FontAwesomeIcon
          icon={faCopy} size='lg'
          id={`${walletProp}-icon`}
          onClick={(e) => handleCopyToClipboard(e)}
          style={{ cursor: 'pointer' }}
        />
      )}
      {!iconVis && (
        <span
          id={`${walletProp}-word`}
          style={{ color: 'green' }}
        >
          Copied!
        </span>
      )}
    </>
  )
}

export default CopyOnClick

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/sweep/index.js`:

```js
/*
 This Sweep component allows users to sweep a private key and transfer any
 BCH or SLP tokens into their wallet.
*/

// Global npm libraries
import React from 'react'
import { Container, Row, Col, Form, Button, Modal, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import Sweeper from 'bch-token-sweep'

// let _this

const SweepWif = (props) => {
  const { appData } = props
  console.log('appData', appData)
  const [wifToSweep, setWifToSweep] = React.useState('')
  const [showModal, setShowModal] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [hideSpinner, setHideSpinner] = React.useState(false)

  // shouldRefreshOnModalClose: false

  // Helper function to validate WIF
  const validateWIF = (WIF) => {
    if (typeof WIF !== 'string') return false
    if (WIF.length !== 52) return false
    if (WIF[0] !== 'L' && WIF[0] !== 'K') return false
    return true
  }

  // Update wallet state function
  const updateWalletState = async () => {
    const wallet = appData.wallet
    const bchBalance = await wallet.getBalance({ bchAddress: wallet.walletInfo.cashAddress })
    await wallet.initialize()
    const slpTokens = await wallet.listTokens(wallet.walletInfo.cashAddress)
    appData.updateBchWalletState({ walletObj: { bchBalance, slpTokens }, appData })
  }

  // Handle sweep function
  const handleSweep = async (e) => {
    e.preventDefault()
    try {
      console.log(`Sweeping this WIF: ${wifToSweep}`)

      // Set modal initial state
      setShowModal(true)
      setHideSpinner(false)
      setStatusMsg('')

      // Input validation
      const isWIF = validateWIF(wifToSweep)
      if (!isWIF) {
        setHideSpinner(true)
        setStatusMsg(<b style={{ color: 'red' }}>Input is not a WIF private key.</b>)
        return
      }

      try {
        const walletWif = appData.wallet.walletInfo.privateKey
        const toAddr = appData.wallet.slpAddress

        // Instance the Sweep library
        const sweep = new Sweeper(wifToSweep, walletWif, appData.wallet)
        await sweep.populateObjectFromNetwork()

        // Constructing the sweep transaction
        const hex = await sweep.sweepTo(toAddr)
        const txid = await appData.wallet.ar.sendTx(hex)

        // Generate status message
        const newStatusMsg = (
          <>
            <p>Sweep succeeded!</p>
            <p>Transaction ID: {txid}</p>
            <p>
              <a href={`https://blockchair.com/bitcoin-cash/transaction/${txid}`} target='_blank' rel='noreferrer'>
                TX on Blockchair BCH Block Explorer
              </a>
            </p>
            <p>
              <a href={`https://token.fullstack.cash/transactions/?txid=${txid}`} target='_blank' rel='noreferrer'>
                TX on token explorer
              </a>
            </p>
          </>
        )

        setHideSpinner(true)
        setStatusMsg(newStatusMsg)
        setWifToSweep('')

        await updateWalletState()
      } catch (err) {
        setHideSpinner(true)
        setStatusMsg(<b style={{ color: 'red' }}>{`Error: ${err.message}`}</b>)
      }
    } catch (err) {
      console.error('Error in handleSweep(): ', err)
    }
  }

  // Modal component
  const getModal = () => (
    <Modal show={showModal} size='lg' onHide={() => setShowModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Sweeping...</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            {!hideSpinner && (
              <Col style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ marginRight: '10px' }}>Sweeping private key...</span>  <Spinner animation='border' />
              </Col>
            )}
          </Row>
          <br />
          {statusMsg && (
            <Row>
              <Col style={{ textAlign: 'center' }}>{statusMsg}</Col>
            </Row>
          )}
        </Container>
      </Modal.Body>
      <Modal.Footer />
    </Modal>
  )

  return (
    <>
      <Container>
        <Row>
          <Col style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/QW9xixHaEJE' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>

        <Row>
          <Col>
            <p>
              This View is used to 'sweep' a private key. This will transfer
              any BCH or SLP tokens from a paper wallet to your web wallet.
              Paper wallets are used to store BCH and tokens. You
              can <a href='https://paperwallet.fullstack.cash/' target='_blank' rel='noreferrer'>generate paper wallets here</a>.
            </p>
            <p>
              Paste the private key of a paper wallet below and click the button
              to sweep the funds. The private key must be in WIF format. It will
              start with the letter 'K' or 'L'.
            </p>
          </Col>
        </Row>

        <Row>
          <Col>
            <Form onSubmit={handleSweep}>
              <Form.Group controlId='formWif' style={{ textAlign: 'center' }}>
                <Form.Control
                  type='text'
                  placeholder='KzJqZxi5XSo36woCy7MFVNRPDpfp8x8FpkhRvrErKBBrDXRVY9Ft'
                  onChange={(e) => setWifToSweep(e.target.value)}
                  value={wifToSweep}
                />
              </Form.Group>
            </Form>
          </Col>
        </Row>
        <br />

        <Row style={{ textAlign: 'center' }}>
          <Col>
            <Button variant='info' onClick={handleSweep}>
              Sweep
            </Button>
          </Col>
        </Row>
      </Container>
      {showModal && getModal()}
    </>
  )
}

export default SweepWif

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/app-body/placeholder3.js`:

```js
/*
  This is a placeholder View
*/

// Global npm libraries
import React, { useEffect } from 'react'

function Placeholder3 (props) {
  useEffect(() => {
    console.log('Placeholder 3 loaded.')
  }, [])

  return (
    <>
      <p style={{ padding: '25px' }}>This is placeholder View #3</p>
    </>
  )
}

export default Placeholder3

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/starter-views.js`:

```js
/**
 *  This file contains the views that are displayed before and after the BCH wallet is initialized.
 */
import React from 'react'
import WaitingModal from './waiting-modal'
import AppBody from './app-body'
// This is rendered *before* the BCH wallet is initialized.
export function UninitializedView (props = {}) {
  // console.log('UninitializedView props: ', props)
  const { appData } = props

  const heading = 'Connecting to BCH blockchain...'

  return (
    <>
      <WaitingModal
        heading={heading}
        body={appData.modalBody}
        hideSpinner={appData.hideSpinner}
        denyClose={appData.denyClose}
      />
      {
        appData.asyncInitFinished
          ? <AppBody menuState={100} wallet={appData.wallet} appData={appData} />
          : null
      }
    </>
  )
}

// This is rendered *after* the BCH wallet is initialized.
export function InitializedView (props) {
  const { appData } = props

  return (
    <>
      <br />
      <AppBody menuState={appData.menuState} appData={appData} />
    </>
  )
}

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/waiting-modal/index.js`:

```js
/*
  This 'Waiting Modal' component displays a spinner animation and a status log.
  It's used to inform the user that the app is waiting for something, and to
  display progress.
*/

// Global npm libraries
import React, { useState } from 'react'
import { Container, Row, Col, Modal, Spinner } from 'react-bootstrap'

function ModalTemplate (props) {
  // State
  const [show, setShow] = useState(true)

  // Dependency injection of props
  const denyClose = props.denyClose // Determins if user is allowed to close modal.
  const closeFunc = props.closeFunc // Optional function called after modal is closed.
  const heading = props.heading // Title of the modal
  const body = props.body // Body of the modal
  const hideSpinner = props.hideSpinner // Hide the animated spinner

  // This function is called when the modal is closed
  const handleClose = () => {
    console.log(`props.denyClose: ${denyClose}`)
    if (denyClose) return

    setShow(false)

    if (closeFunc) {
      closeFunc()
    }
  }
  // const handleShow = () => setShow(true)

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{heading}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            <Col style={{ textAlign: 'center' }}>
              <BodyList body={body} />
              {hideSpinner ? null : <Spinner animation='border' />}
            </Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer />
    </Modal>
  )
}

// This function populates the body of the modal. It expects props.body to be
// an array of strings.
function BodyList (props) {
  const items = props.body
  // console.log('BodyList items: ', items)

  const listItems = []

  // Paragraphs
  for (let i = 0; i < items.length; i++) {
    listItems.push(<p key={items[i]}><code>{items[i]}</code></p>)
  }

  return (
    listItems
  )
}

// export default WaitingModal
export default ModalTemplate

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/components/load-scripts.js`:

```js
/*
  Load <script> libraries
*/

import useScript from '../hooks/use-script'

function LoadScripts () {
  // useScript('https://unpkg.com/minimal-slp-wallet?module')

  // Load the libraries from the local directory.
  useScript(`${process.env.PUBLIC_URL}/minimal-slp-wallet.min.js`)

  return true
}

export default LoadScripts

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/hooks/state.js`:

```js
import { useState } from 'react'
// import { useQueryParam, StringParam } from 'use-query-params'
import useLocalStorageState from 'use-local-storage-state'
import AppUtil from '../util'

import { useLocation } from 'react-router-dom'

function useAppState () {
  const location = useLocation()

  // Load Local storage Data
  const [lsState, setLSState, { removeItem }] = useLocalStorageState('bchWalletState-template', {
    ssr: true,
    defaultValue: {
      serverUrl: 'https://free-bch.fullstack.cash' // Default server
    }
  })

  console.log('lsState: ', lsState)

  // Initialize  data states
  const [serverUrl, setServerUrl] = useState(lsState.serverUrl) // Default server url
  const [menuState, setMenuState] = useState(0)
  const [wallet, setWallet] = useState(false)
  const [servers, setServers] = useState([])

  // Startup state management
  const [asyncInitStarted, setAsyncInitStarted] = useState(false)
  const [asyncInitFinished, setAsyncInitFinished] = useState(false)
  const [asyncInitSucceeded, setAsyncInitSucceeded] = useState(null)

  // Modal state management
  const [showStartModal, setShowStartModal] = useState(true)
  const [modalBody, setModalBody] = useState([])
  const [hideSpinner, setHideSpinner] = useState(false)
  const [denyClose, setDenyClose] = useState(false)

  // The wallet state makes this a true progressive web app (PWA). As
  // balances, UTXOs, and tokens are retrieved, this state is updated.
  // properties are enumerated here for the purpose of documentation.

  // Local storage
  // const [lsState, setLSState, { removeItem }] = useLocalStorageState('bchWalletState', {
  //   ssr: true,
  //   defaultValue: {}
  // })
  // console.log('lsState: ', lsState)
  const removeLocalStorageItem = removeItem
  const updateLocalStorage = (lsObj) => {
    // console.log(`updateLocalStorage() input: ${JSON.stringify(lsObj, null, 2)}`)

    // Progressively overwrite the LocalStorage state.
    const newObj = Object.assign({}, lsState, lsObj)
    // console.log(`updateLocalStorage() output: ${JSON.stringify(newObj, null, 2)}`)

    setLSState(newObj)
  }

  const [bchWalletState, setBchWalletState] = useState({
    mnemonic: undefined,
    address: undefined,
    cashAddress: undefined,
    slpAddress: undefined,
    privateKey: undefined,
    publicKey: undefined,
    legacyAddress: undefined,
    hdPath: undefined,
    bchBalance: 0,
    slpTokens: [],
    bchUsdPrice: 150
  })

  // This function is passed to child components in order to update the wallet
  // state. This function is important to make this wallet a PWA.
  function updateBchWalletState (inObj = {}) {
    try {
      const { walletObj, appData } = inObj

      // Debuging
      // console.log('updateBchWalletState() walletObj: ', walletObj)
      // console.log('updateBchWalletState() appData: ', appData)

      appData.setBchWalletState(oldState => {
        const newBchWalletState = Object.assign({}, oldState, walletObj)
        // console.log('newBchWalletState: ', newBchWalletState)

        return newBchWalletState
      })

    // console.log(`New wallet state: ${JSON.stringify(bchWalletState, null, 2)}`)
    } catch (err) {
      console.error('Error in App.js updateBchWalletState()')
      throw err
    }
  }

  return {
    serverUrl,
    setServerUrl,
    menuState,
    setMenuState,
    wallet,
    setWallet,
    servers,
    setServers,
    asyncInitStarted,
    setAsyncInitStarted,
    asyncInitFinished,
    setAsyncInitFinished,
    asyncInitSucceeded,
    setAsyncInitSucceeded,
    showStartModal,
    setShowStartModal,
    modalBody,
    setModalBody,
    hideSpinner,
    setHideSpinner,
    denyClose,
    setDenyClose,
    bchWalletState,
    setBchWalletState,
    lsState,
    setLSState,
    removeLocalStorageItem,
    updateLocalStorage,
    updateBchWalletState,
    appUtil: new AppUtil(),
    currentPath: location.pathname

  }
}

export default useAppState

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/hooks/use-script.js`:

```js
import { useEffect } from 'react'

const useScript = url => {
  useEffect(() => {
    const script = document.createElement('script')

    script.src = url
    script.async = true

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [url])
}

export default useScript

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/App.test.js`:

```js
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
  ReactDOM.unmountComponentAtNode(div)
})

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/config/index.js`:

```js
/*
  Global configuration settings for this app.
*/

const config = {
  // Default IPFS CID for the app. This will be overwritten by dynamic lookup.
  ipfsCid: 'bafybeibya4cwro6rgqfaazqxckcchy6qo5sz2aqc4dx7ptcvpns5peqcz4',

  // BCH address used to point to the latest version of the IPFS CID.
  appBchAddr: 'bitcoincash:qztv87ppjh82v527jq2drp4u8rzzn63r5cmhth2zzm',

  // Backup Info that goes into the Footer.
  ghPagesUrl: 'https://permissionless-software-foundation.github.io/react-bootstrap-web3-spa/',
  ghRepo: 'https://github.com/Permissionless-Software-Foundation/bch-wallet-web3-spa',
  radicleUrl: 'https://app.radicle.network/seeds/maple.radicle.garden/rad:git:hnrkd5cjwwb5tzx37hq9uqm5ubon7ee468xcy/remotes/hyyycncbn9qzqmobnhjq9rry6t4mbjiadzjoyhaknzxjcz3cxkpfpc'

}

export default config

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/App.css`:

```css
.header {
  text-align: center;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1 0 auto;
}

.balance-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.nav-link-active {
  color: white !important;
  text-decoration: none;
  padding: 0.5rem;
}

.nav-link-inactive {
  color: gray !important;
  text-decoration: none;
  padding: 0.5rem;

}

#address-switch {
  cursor: pointer;
}


/* Remove input number arrows Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Remove input number arrows Firefox */
input[type=number] {
  --moz-appearance: textfield;
}
```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/services/async-load.js`:

```js
/*
  This library gets data that requires an async wait.
*/

// Global npm libraries
import axios from 'axios'
// Local libraries
import GistServers from './gist-servers'

class AsyncLoad {
  constructor () {
    this.BchWallet = false
  }

  // Load the minimal-slp-wallet which comes in as a <script> file and is
  // attached to the global 'window' object.
  async loadWalletLib () {
    try {
      do {
        if (typeof window !== 'undefined' && window.SlpWallet) {
          this.BchWallet = window.SlpWallet

          return this.BchWallet
        } else {
          console.log('Waiting for wallet library to load...')
        }

        await sleep(1000)
      } while (!this.BchWallet)
    } catch (error) {
      console.error('Error loading wallet library: ', error)
      throw error
    }
  }

  // Initialize the BCH wallet
  async initWallet (restURL, mnemonic, appData) {
    try {
      const options = {
        interface: 'consumer-api',
        restURL,
        noUpdate: true
      }

      let wallet
      if (mnemonic) {
        // Load the wallet from the mnemonic, if it's available from local storage.
        wallet = new this.BchWallet(mnemonic, options)
      } else {
        // Generate a new mnemonic and wallet.
        wallet = new this.BchWallet(null, options)
      }

      // Wait for wallet to initialize.
      await wallet.walletInfoPromise
      await wallet.initialize()
      console.log('starting to update wallet state.')
      // Update the state of the wallet.
      appData.updateBchWalletState({ walletObj: wallet.walletInfo, appData })
      console.log('finished updating wallet state.')
      // Save the mnemonic to local storage.
      if (!mnemonic) {
        const newMnemonic = wallet.walletInfo.mnemonic
        appData.updateLocalStorage({ mnemonic: newMnemonic })
      }

      this.wallet = wallet

      return wallet
    } catch (error) {
      console.error('Error initializing wallet: ', error)
      throw error
    }
  }

  // Get the BCH balance of the wallet.
  async getWalletBchBalance (wallet, updateBchWalletState, appData) {
    try {
      // Get the BCH balance of the wallet.
      const bchBalance = await wallet.getBalance({ bchAddress: wallet.walletInfo.cashAddress })

      await wallet.walletInfoPromise
      await wallet.initialize()
      // console.log(`mnemonic: ${wallet.walletInfo.mnemonic}`)

      // Update the state of the wallet with the balances
      updateBchWalletState({ walletObj: { bchBalance }, appData })

      return true
    } catch (error) {
      console.error('Error getting wallet BCH balance: ', error)
      throw error
    }
  }

  // Get the spot exchange rate for BCH in USD.
  async getUSDExchangeRate (wallet, updateBchWalletState, appData) {
    try {
      const bchUsdPrice = await wallet.getUsd()

      // Update the state of the wallet
      updateBchWalletState({ walletObj: { bchUsdPrice }, appData })

      return true
    } catch (error) {
      console.error('Error getting USD exchange rate: ', error)
      throw error
    }
  }

  // Get a list of SLP tokens held by the wallet.
  async getSlpTokenBalances (wallet, updateBchWalletState, appData) {
    try {
      // Get token information from the wallet. This will also initialize the UTXO store.
      const slpTokens = await wallet.listTokens(wallet.walletInfo.cashAddress)
      // console.log('slpTokens: ', slpTokens)

      console.log('slpTokens: ', slpTokens)

      // Update the state of the wallet with the balances
      updateBchWalletState({ walletObj: { slpTokens }, appData })

      return true
    } catch (error) {
      console.error('Error getting SLP tokens', error)
      throw error
    }
  }

  // Get token data for a given Token ID
  async getTokenData (tokenId) {
    try {
      const tokenData = await this.wallet.getTokenData(tokenId)

      // Convert the IPFS CIDs into actual data.
      tokenData.immutableData = await this.getIpfsData(tokenData.immutableData)
      tokenData.mutableData = await this.getIpfsData(tokenData.mutableData)

      return tokenData
    } catch (error) {
      console.error('Error getting Token data', error)
      throw error
    }
  }

  // Get data about a Group token
  async getGroupData (tokenId) {
    try {
      const tokenData = await this.getTokenData(tokenId)

      const groupData = {
        immutableData: tokenData.immutableData,
        mutableData: tokenData.mutableData,
        nfts: tokenData.genesisData.nfts,
        tokenId: tokenData.genesisData.tokenId
      }

      return groupData
    } catch (error) {
      console.error('Error getting Token group data', error)
      throw error
    }
  }

  // Given an IPFS URI, this will download and parse the JSON data.
  async getIpfsData (ipfsUri) {
    try {
      const cid = ipfsUri.slice(7)

      const downloadUrl = `https://${cid}.ipfs.dweb.link/data.json`

      const response = await axios.get(downloadUrl)
      const data = response.data

      return data
    } catch (error) {
      console.error('Error getting IPFS data', error)
      throw error
    }
  }

  // Get a list of alternative back end servers.
  async getServers () {
    // Try to get the list from GitHub
    try {
      const gistLib = new GistServers()
      const gistServers = await gistLib.getServerList()

      return gistServers
    } catch (err) {
      console.error('Error trying to retrieve list of servers from GitHub: ', err)
      console.log('Returning hard-coded list of servers.')

      const defaultOptions = [
        { value: 'https://free-bch.fullstack.cash', label: 'https://free-bch.fullstack.cash' },
        { value: 'https://dev-consumer.psfoundation.info', label: 'https://dev-consumer.psfoundation.info' }
      ]

      return defaultOptions
    }
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default AsyncLoad

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/services/gist-servers.js`:

```js
/*
  This library downloads a dynamic list of back-end servers from a GitHub Gist.
*/

const axios = require('axios')

class GistServers {
  constructor () {
    this.axios = axios
  }

  // Retrieve a JSON file from a GitHub Gist
  async getServerList () {
    try {
      // https://gist.github.com/christroutner/e818ecdaed6c35075bfc0751bf222258
      // 'https://api.github.com/gists/63c5513782181f8b8ea3eb89f7cadeb6'

      const gistUrl = 'https://consumers.psfoundation.info/consumers.json'

      // Retrieve the gist from github.com.
      const result = await this.axios.get(gistUrl)
      // console.log('result.data: ', result.data)

      // Get the current content of the gist.
      const content = result.data.servers
      // console.log('content: ', content)

      return content
    } catch (err) {
      console.error('Error in getCRList()')
      throw err
    }
  }
}

export default GistServers

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/src/App.js`:

```js
/*
  This is an SPA that creates a template for future BCH web3 apps.
*/

// Global npm libraries
import React, { useEffect, useCallback } from 'react'

// Local libraries
import './App.css'
import LoadScripts from './components/load-scripts'
import AsyncLoad from './services/async-load'
import Footer from './components/footer'
import NavMenu from './components/nav-menu'
import useAppState from './hooks/state'
import { UninitializedView, InitializedView } from './components/starter-views'

function App (props) {
  // Load all the app state into a single object that can be passed to child
  // components.
  const appData = useAppState()

  // Add a new line to the waiting modal.
  const addToModal = useCallback((inStr, appData) => {
    // console.log('addToModal() inStr: ', inStr)

    appData.setModalBody(prevBody => {
      // console.log('prevBody: ', prevBody)
      prevBody.push(inStr)
      return prevBody
    })
  }, [])

  /** Load all required data before component start. */
  useEffect(() => {
    async function asyncEffect () {
      console.log('asyncInitStarted: ', appData.asyncInitStarted)

      if (!appData.asyncInitStarted) {
        try {
          // Instantiate the async load object.
          const asyncLoad = new AsyncLoad()
          appData.setAsyncInitStarted(true)

          addToModal('Loading minimal-slp-wallet', appData)
          appData.setDenyClose(true)

          await asyncLoad.loadWalletLib()
          // console.log('Wallet: ', Wallet)

          addToModal('Getting alternative servers', appData)
          const gistServers = await asyncLoad.getServers()
          appData.setServers(gistServers)
          // console.log('servers: ', servers)

          addToModal('Initializing wallet', appData)
          console.log(`Initializing wallet with back end server ${appData.serverUrl}`)

          const walletTemp = await asyncLoad.initWallet(appData.serverUrl, appData.lsState.mnemonic, appData)
          appData.setWallet(walletTemp)
          // appData.updateBchWalletState({ walletObj: walletTemp.walletInfo, appData })

          // Get the BCH balance of the wallet.
          addToModal('Getting BCH balance', appData)
          await asyncLoad.getWalletBchBalance(walletTemp, appData.updateBchWalletState, appData)

          // Get the SLP tokens held by the wallet.
          addToModal('Getting SLP tokens', appData)
          await asyncLoad.getSlpTokenBalances(walletTemp, appData.updateBchWalletState, appData)

          // Get the BCH spot price
          addToModal('Getting BCH spot price in USD', appData)
          await asyncLoad.getUSDExchangeRate(walletTemp, appData.updateBchWalletState, appData)

          // Update state
          appData.setShowStartModal(false)
          appData.setDenyClose(false)

          // Update the startup state.
          appData.setAsyncInitFinished(true)
          appData.setAsyncInitSucceeded(true)
          console.log('App.js useEffect() startup finished successfully')
        } catch (err) {
          const errModalBody = [
            `Error: ${err.message}`,
            'Try selecting a different back end server using the drop-down menu at the bottom of the app.'
          ]
          appData.setModalBody(errModalBody)

          // Update Modal State
          appData.setHideSpinner(true)
          appData.setShowStartModal(true)
          appData.setDenyClose(false)

          // Update the startup state.
          appData.setAsyncInitFinished(true)
          appData.setAsyncInitSucceeded(false)
        }
      }
    }
    asyncEffect()
  }, [appData, addToModal])

  return (
    <>
      <LoadScripts />
      <div className='app-container'>
        <NavMenu appData={appData} />
        {/** Define View to show */}
        <div className='main-content'>
          {
            appData.showStartModal
              ? (<UninitializedView appData={appData} />)
              : (<InitializedView menuState={appData.menuState} appData={appData} />)
          }
        </div>
        <Footer appData={appData} />
      </div>
    </>
  )
}

export default App

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/README.md`:

```md
# bch-wallet-web3-spa

This is a web-based single page app (SPA) written in React. It provides non-custodial wallet features for the Bitcoin Cash blockchain, including support for SLP tokens and NFTs.

The code repository is the successor to [bch-wallet-web-android](https://github.com/Permissionless-Software-Foundation/bch-wallet-web3-android). It is forked from [react-bootstrap-web3-spa](https://github.com/Permissionless-Software-Foundation/react-bootstrap-web3-spa), and any updates to that upstream repository are pulled into this repository. The individual wallet components from bch-wallet-web-android have been audited, refactored, and ported to this repository. It a complete rewrite of the original codebase.

This code repository is intended to be a boilerplate for creating creative BCH-based web apps. It is built on top of the [Cash Stack](https://cashstack.info) web3 architecture, which provides a censorship-resistant back-end for accessing the Bitcoin Cash blockchain.

## Installation
```bash
git clone https://github.com/Permissionless-Software-Foundation/bch-wallet-web3-spa
cd bch-wallet-web3-spa
npm install
npm start
npm run build
```

## Support

Have questions? Need help? Join our community support
[Telegram channel](https://t.me/bch_js_toolkit)

## Donate

This open source software is developed and maintained by the [Permissionless Software Foundation](https://psfoundation.cash). If this library provides value to you, please consider making a donation to support the PSF developers:

<div align="center">
<img src="./img/donation-qr.png" />
<p>bitcoincash:qqsrke9lh257tqen99dkyy2emh4uty0vky9y0z0lsr</p>
</div>

## License
[MIT](./LICENSE.md)

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/LICENSE.md`:

```md
Copyright 2025 Chris Troutner

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/dev-docs/README.md`:

```md
# Developer Docs

This file contains notes taken during software development. These notes may eventually be edited into informaiton that goes into the top-level README, or other documentation.

## Main Features of this App

- [react-bootstrap](https://react-bootstrap.github.io/) is used for general style and layout control.
- An easily customizable waiting modal component can be invoked while waiting for network calls to complete.
- [minimal-slp-wallet](https://www.npmjs.com/package/minimal-slp-wallet) is used to access tokens and BCH on the Bitcoin Cash blockchain.
- A 'server selection' dropdown allows the user to select from an array of redundent back end servers.
- This site is statically compiled, uploaded to Filecoin, and served over IPFS for censorship resistance and version control.

## File Layout

The top-level file layout of this app looks like this:

- App.js - the main application orchestates these child components:
  - GetRestUrl - retrieves the REST URL for the selected back-end web3 server from query paramenters in the URL.
  - LoadScripts - Loads the modal with a waiting spinner animation until the external script files are loaded.
  - NavMenu - the collapsible navigation menu
  - InitializedView & UnitializedView - the default Views that are displayed depending on the state of the app.
  - ServerSelect - allows the user to select a different web3 back end server.
  - Footer - Footer links

After initialization, the InitailizedView is displayed. This loads the AppBody, which is a wrapper for each View. Views are selected using the navigation menu. When one View is selected, the others are hidden.

## Loading of Wallet
The wallet library [minimal-slp-wallet](https://www.npmjs.com/package/minimal-slp-wallet) is loaded at startup, and initialized with a web3 back end server. By default, the back-end server is free-bch.fullstack.cash. However, a list of back end servers provided by the [PSF](https://psfoundation.cash) are loaded into a drop-down from a GitHub

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/package.json`:

```json
{
  "name": "bch-wallet-web3-spa",
  "version": "1.0.0",
  "dependencies": {
    "@chris.troutner/react-jdenticon": "1.0.1",
    "@fortawesome/fontawesome-svg-core": "6.7.2",
    "@fortawesome/free-regular-svg-icons": "6.7.2",
    "@fortawesome/free-solid-svg-icons": "6.7.2",
    "@fortawesome/react-fontawesome": "0.2.2",
    "axios": "0.27.2",
    "bch-message-lib": "2.2.1",
    "bch-token-sweep": "2.2.1",
    "bootstrap": "5.2.0",
    "qrcode.react": "4.2.0",
    "query-string": "7.1.1",
    "react": "19.0.0",
    "react-bootstrap": "2.10.7",
    "react-dom": "19.0.0",
    "react-router-dom": "7.1.3",
    "react-scripts": "5.0.1",
    "use-local-storage-state": "19.5.0",
    "use-query-params": "1.2.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "echo 'no tests'",
    "eject": "react-scripts eject",
    "lint": "standard --env mocha --fix",
    "pub": "node deploy/publish-main.js",
    "pub:ghp": "./deploy/publish-gh-pages.sh"
  },
  "eslintConfig": {
    "extends": "react-app"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "husky": "9.1.7",
    "minimal-slp-wallet": "5.13.1",
    "semantic-release": "24.2.3",
    "standard": "17.0.0",
    "web3.storage": "4.3.0"
  },
  "release": {
    "publish": [
      {
        "path": "@semantic-release/npm",
        "npmPublish": false
      }
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint"
    }
  }
}

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/publish-main.js`:

```js
/*
  This is the main publish file that aggregates the other publish libraries
  and orchestrates them, so that one command can publish to different platforms.
*/

// Local libraries
const publishToFilecoin = require('./publish-filecoin')
const publishToPinata = require('./publish-pinata')
const publishToBch = require('./publish-bch')

async function publish () {
  try {
    // Publish to Filecoin
    const cid = await publishToFilecoin()
    console.log('Content added to Filecoin with CID:', cid)
    console.log(`https://${cid}.ipfs.dweb.link/`)

    // Publish to Pinata
    await publishToPinata(cid)

    // Public to BCH
    const txid = await publishToBch(cid)
    console.log(`\nBCH blockchain updated with new CID. TXID: ${txid}`)
    console.log(`https://blockchair.com/bitcoin-cash/transaction/${txid}`)
  } catch (err) {
    console.error('Error while trying to publish app: ', err)
  }
}
publish()

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/README.md`:

```md
# Deploy
This directory contains scripts for deploying the app to different platforms and blockchains.

## App Deployment

### Blockchains
- Filecoin - The compiled app is uploaded to the Filecoin blockchain using [publish-filecoin.js](./publish-filecoin.js). Running this script requires a free API key from [web3.storage](https://web3.storage).
- IPFS - The files are also pinned by the Pinata service using [publish-pinata.js](./publish-filecoin.js). Running this script requires a free JWT token from [Pinata](https://pinata.cloud).
- Bitcoin Cash - The IPFS CID is written to the Bitcoin Cash blockchain with [publish-bch.js](/publish-bch.js) This creates an immutable, censorship-resistant, globally available, and secure pointer to the latest version of the app.

The above deployment scripts are orchestrated with [publish-main.js](`./publish-main.js`). This script is run by executing `npm run pub`.

### GitHub Pages
The app can also be deployed to GitHub pages. This requires switching to the `gh-pages` branch and running the command `npm run pub:ghp`.

## Code Deployment
The code in this repository is backed up to the [Radicle](https://radicle.network/get-started.html) network, as GitHub has been increasing its censorship of code. Find instructions for *consuming* the code in the [top-level README](../README.md). To learn how install Radicle on your own machine and collaborate on the code that way, check out [this research article](https://christroutner.github.io/trouts-blog/docs/censorship/radicle).

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/publish-pinata.js`:

```js
/*
  This library will pin the app to Pinata. It expects a CID
  as input, which is the output of publish-filecoin.js.

  Filecoin should be though of as cold-storage for data. It's very slow to
  retrieve. Pinata can be though of as RAM. It keeps content at the ready and
  fast to deliver. They are complimentary services.

  In order to run this script, you must obtain an API key from pinata.cloud.
  That key should be saved to an environment variable named PINATA_JWT.
*/

const axios = require('axios')

async function publishToPinata (cid) {
  // Get the Pinata token from the environment variable.
  const pinataToken = process.env.PINATA_JWT
  if (!pinataToken) {
    throw new Error(
      'Pinata JWT token not detected. Get a token from https://pinata.cloud and save it to the PINATA_JWT environment variable.'
    )
  }

  const now = new Date()

  const data = JSON.stringify({
    hashToPin: cid,
    pinataMetadata: {
      name: 'react-bootstrap-web3-spa',
      keyvalues: {
        timestamp: now.toISOString()
      }
    }
  })

  const config = {
    method: 'post',
    url: 'https://api.pinata.cloud/pinning/pinByHash',
    headers: {
      Authorization: `Bearer ${pinataToken}`,
      'Content-Type': 'application/json'
    },
    data
  }

  const res = await axios(config)

  console.log('\nCID pinned using Pinata:')
  console.log(res.data)
}

module.exports = publishToPinata

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/publish-filecoin.js`:

```js
/*
  This library is used to publish the compiled app to Filecoin.
  The publishToFilecoin() function will upload the 'build' folder to Filecoin
  via the web3.storage API.
  The function will return an object that contains the CID of the uploaded
  directory, and a URL for loading the app in a browser.

  In order to run this script, you must obtain an API key from web3.storage.
  That key should be saved to an environment variable named FILECOIN_TOKEN.
*/

const { Web3Storage, getFilesFromPath } = require('web3.storage')
const fs = require('fs')

async function publish () {
  try {
    const currentDir = `${__dirname}`
    // console.log(`Current directory: ${dir}`)
    const buildDir = `${currentDir}/../build`

    // Get the Filecoin token from the environment variable.
    const filecoinToken = process.env.FILECOIN_TOKEN
    if (!filecoinToken) {
      throw new Error(
        'Filecoin token not detected. Get a token from https://web3.storage and save it to the FILECOIN_TOKEN environment variable.'
      )
    }

    // Get a list of all the files to be uploaded.
    const fileAry = await getFileList(buildDir)
    // console.log(`fileAry: ${JSON.stringify(fileAry, null, 2)}`)

    // Upload the files to Filecoin.
    const cid = await uploadToFilecoin(fileAry, filecoinToken)

    // console.log('Content added to Filecoin with CID:', cid)
    // console.log(`https://${cid}.ipfs.dweb.link/`)

    return cid
  } catch (err) {
    console.error(err)
  }
}

function getFileList (buildDir) {
  const fileAry = []

  return new Promise((resolve, reject) => {
    fs.readdir(buildDir, (err, files) => {
      if (err) return reject(err)

      files.forEach(file => {
        // console.log(file)
        fileAry.push(`${buildDir}/${file}`)
      })

      return resolve(fileAry)
    })
  })
}

async function uploadToFilecoin (fileAry, token) {
  const storage = new Web3Storage({ token })

  const files = []
  for (let i = 0; i < fileAry.length; i++) {
    const thisPath = fileAry[i]
    // console.log('thisPath: ', thisPath)

    const pathFiles = await getFilesFromPath(thisPath)
    // console.log('pathFiles: ', pathFiles)

    files.push(...pathFiles)
  }

  console.log(`Uploading ${files.length} files. Please wait...`)
  const cid = await storage.put(files)

  return cid
}

module.exports = publish

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/publish-gh-pages.sh`:

```sh
#!/bin/bash

# Bash shell script to publish the app to GitHub pages.
# Ensure you are in the gh-pages branch.

#pwd
#git checkout gh-pages
#git merge master

npm run build
cp -r build docs
git add -A
git commit -m "Updating GitHub page"
git push

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/deploy/publish-bch.js`:

```js
/*
  This script will write the CID for the current version of the app to an
  address on the BCH blockchain. This creates an immutable, censorship-resistant,
  globally available, and secure pointer to the latest version of the app.

  The exported function expects an IPFS CID as input and returns a TXID for a
  BCH transaction.

  This function expects this environtment variable to contain a WIF private key
  with BCH to write to the blockchain:
  - REACT_BOOTSTRAP_WEB3_SPA_WIF
*/

// Global npm libraries
// const BCHJS = require('@psf/bch-js')
const BchWallet = require('minimal-slp-wallet/index')
const BchMessageLib = require('bch-message-lib/index')

async function publishToBch (cid) {
  try {
    // Get the Filecoin token from the environment variable.
    const wif = process.env.REACT_BOOTSTRAP_WEB3_SPA_WIF
    if (!wif) {
      throw new Error(
        'WIF private key not detected. Get a private key from https://wallet.fullstack.cash and save it to the REACT_BOOTSTRAP_WEB3_SPA_WIF environment variable.'
      )
    }

    // Initialize libraries for working with BCH blockchain.
    // const bchjs = new BCHJS()
    const wallet = new BchWallet(wif, {
      interface: 'consumer-api'
    })
    await wallet.walletInfoPromise
    await wallet.initialize()
    const bchMsg = new BchMessageLib({ wallet })

    // Publish the CID to the BCH blockchain.
    const hex = await bchMsg.memo.memoPush(cid, 'IPFS UPDATE')

    // Broadcast the transaction to the network.
    const txid = await wallet.ar.sendTx(hex)
    // console.log(`BCH blockchain updated with new CID. TXID: ${txid}`)
    // console.log(`https://blockchair.com/bitcoin-cash/transaction/${txid}`)

    return txid
  } catch (err) {
    console.error(err)
  }
}

module.exports = publishToBch

```

`/home/trout/work/psf/code/bch-wallet-web3-spa/public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BCH Web3 Template</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>

```
