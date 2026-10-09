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

      // if bchInitLoaded is 'false', them set as true , to show the new balance.
      appData.updateBackGroundInitState({ bchInitLoaded: true })

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
