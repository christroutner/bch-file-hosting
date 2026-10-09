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
  const { bchInitLoaded, asyncBackgroundFinished } = appData.asyncBackGroundInitState

  // Background bch data loaded finished
  const backgroundDataLoaded = bchInitLoaded || asyncBackgroundFinished

  // Child function references
  const refreshBchBalanceRef = useRef()

  // Update the balance of the wallet.
  async function handleButtonRefreshBalance (appData) {
    // Call the child function
    refreshBchBalanceRef.current.handleRefreshBalance(appData)
  }

  return (
    <>
      <Button variant='success' onClick={() => { handleButtonRefreshBalance(appData) }} disabled={!backgroundDataLoaded}>
        <FontAwesomeIcon icon={faRedo} size='lg' /> Refresh
      </Button>

      <RefreshBchBalance appData={appData} ref={refreshBchBalanceRef} />
    </>
  )
}

export default RefreshBchBalanceButton
