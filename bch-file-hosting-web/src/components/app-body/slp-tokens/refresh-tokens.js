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
  const { slpInitLoaded, asyncBackgroundFinished } = initialAppData.asyncBackGroundInitState

  // Background bch data loaded finished
  const backgroundDataLoaded = slpInitLoaded || asyncBackgroundFinished

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

      // if slpInitLoaded is 'false', them set as true , to show the new balance.
      appData.updateBackGroundInitState({ slpInitLoaded: true })

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
      <Button variant='success' onClick={handleRefreshTokenBalance} disabled={!backgroundDataLoaded}>
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
