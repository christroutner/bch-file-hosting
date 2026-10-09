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

  const [isSingleView, setIsSingleView] = useState(false)
  // Background process state
  const [asyncBackGroundInitState, setAsyncBackGroundInitState] = useState({
    bchInitLoaded: false, slpInitLoaded: false, asyncBackgroundFinished: false
  })

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

  // Update background state
  function updateBackGroundInitState (inObj = {}) {
    try {
      setAsyncBackGroundInitState(oldState => {
        // console.log('background old state: ', oldState)

        const state = Object.assign({}, oldState, inObj)
        // console.log('background state: ', state)

        return state
      })

    // console.log(`New wallet state: ${JSON.stringify(bchWalletState, null, 2)}`)
    } catch (err) {
      console.error('Error in App.js updateBackGroundInitState()')
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
    currentPath: location.pathname,
    setIsSingleView,
    isSingleView,
    asyncBackGroundInitState,
    updateBackGroundInitState
  }
}

export default useAppState
