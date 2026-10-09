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
