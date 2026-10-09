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

const sigleViewPaths = ['/profile', 'user-data']

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

  const isSignleView = useCallback(async () => {
    // Get current path
    const currentPath = window.location.pathname
    // Get hash from url
    const hash = window.location.hash
    const allowedPath = sigleViewPaths.find((val) => { return currentPath.match(val) })

    if (hash === '#single-view' && allowedPath) {
      addToModal('Loading minimal-slp-wallet', appData)
      const asyncLoad = new AsyncLoad()
      if (!appData.wallet) {
        await asyncLoad.loadWalletLib()
        const walletTemp = await asyncLoad.initStarterWallet(appData.serverUrl, appData.lsState.mnemonic, appData)
        appData.setWallet(walletTemp)
        // Get the BCH spot price
        addToModal('Getting BCH spot price in USD', appData)
        await asyncLoad.getUSDExchangeRate(walletTemp, appData.updateBchWalletState, appData)
      }

      // Update Modal State
      appData.setIsSingleView(true)
      appData.setHideSpinner(true)
      appData.setShowStartModal(false)
      appData.setDenyClose(false)

      /*       // Update the startup state.
      appData.setAsyncInitFinished(true)
      appData.setAsyncInitSucceeded(false) */
      return true
    }
    return false
  }, [appData, addToModal])

  /**
   *  Run background process to get bch and slp balance.
   *  Also update the background state process.
   *  On error this function should trigger a info modal notifying the errors.
   */
  const backgroundAsync = useCallback(async (asyncLoad, walletTemp) => {
    try {
      appData.setModalBody(['Getting BCH balance in background!.'])
      // Get Wallet Balance
      await asyncLoad.getWalletBchBalance(walletTemp, appData.updateBchWalletState, appData)
      // Update Background state
      appData.updateBackGroundInitState({ bchInitLoaded: true })

      // Get SLP Balance
      appData.setModalBody(['Getting SLP tokens in background!.'])
      await asyncLoad.getSlpTokenBalances(walletTemp, appData.updateBchWalletState, appData)

      // Update Background state
      appData.updateBackGroundInitState({ slpInitLoaded: true, asyncBackgroundFinished: true })
    } catch (err) {
      console.log('App.js backgroundAsync() error!', err)

      appData.updateBackGroundInitState({ asyncBackgroundFinished: true })

      addToModal(`Error: ${err.message}`, appData)
      addToModal('Try selecting a different back end server using the drop-down menu at the bottom of the app.\'', appData)

      // Update Modal State
      appData.setHideSpinner(true)
      appData.setShowStartModal(true)
      appData.setDenyClose(false)

      // Update the startup state.
      appData.setAsyncInitFinished(true)
      appData.setAsyncInitSucceeded(false)
    }
  }, [appData, addToModal])

  /** Load all required data before component start. */
  useEffect(() => {
    async function asyncEffect () {
      const singleView = await isSignleView()
      console.log('asyncInitStarted: ', appData.asyncInitStarted)

      if (!appData.asyncInitStarted && !singleView) {
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

          backgroundAsync(asyncLoad, walletTemp)
          // Get the BCH balance of the wallet.
          // addToModal('Getting BCH balance', appData)

          // Get the SLP tokens held by the wallet.
          // addToModal('Getting SLP tokens', appData)
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
  }, [appData, addToModal, isSignleView, backgroundAsync])

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
