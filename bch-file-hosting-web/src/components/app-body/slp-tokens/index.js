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
  const { appData } = props
  const [iconsAreLoaded, setIconsAreLoaded] = useState(false)
  const [dataAreLoaded, setDataAreLoaded] = useState(false)
  const [tokens, setTokens] = useState([])

  const refreshTokenButtonRef = React.useRef()
  const { slpInitLoaded, asyncBackgroundFinished } = props.appData.asyncBackGroundInitState

  // Background bch data loaded finished
  const backgroundDataLoaded = slpInitLoaded || asyncBackgroundFinished
  const backgroundDataError = !slpInitLoaded && asyncBackgroundFinished

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
    await refreshTokenButtonRef.current.handleRefreshTokenBalance()
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

  //  This function loads the token data .
  const lazyLoadTokenData = useCallback(async (tokens) => {
    try {
      setDataAreLoaded(false)
      // map each token and fetch the token data
      for (let i = 0; i < tokens.length; i++) {
        const thisToken = tokens[i]

        // data does not  need to be downloaded, so continue with the next one
        if (thisToken.dataAlreadyDownloaded) continue

        // Try to get token data.
        const tokenData = await appData.wallet.getTokenData(thisToken.tokenId)
        console.log('tokenData', tokenData)
        if (tokenData) {
          // Set data to the token object , this can be used to display the token name in the token card component.
          thisToken.tokenData = tokenData
        }

        // Mark token to prevent fetch token data again.
        thisToken.dataAlreadyDownloaded = true
      }

      setDataAreLoaded(true)
    } catch (error) {
      setDataAreLoaded(true)
    }
  }, [appData])

  // Fetch mutable data if it exist and get the token icon url
  const fetchTokenMutableData = useCallback(async (token) => {
    try {
      // Get the token data
      const tokenData = token.tokenData

      if (!tokenData.mutableData) return false // Return false if no mutable data

      // Get the token icon from the mutable data
      const cid = parseCid(tokenData.mutableData)
      console.log('mutable data cid', cid)

      const { json } = await appData.wallet.cid2json({ cid })
      console.log('json: ', json)
      if (!json) return false

      let iconUrl = json.tokenIcon

      if (json.fullSizedUrl && json.fullSizedUrl.includes('http')) {
        iconUrl = json.fullSizedUrl
      }
      const userData = json.userData
      // Return icon url
      return { iconUrl, userData }
    } catch (error) {
      return false
    }
  }, [appData])

  //  This function loads the token icons from the ipfs gateways.
  const lazyLoadMutableData = useCallback(async (tokens) => {
    try {
      setIconsAreLoaded(false)
      // map each token and fetch the icon url
      for (let i = 0; i < tokens.length; i++) {
        const thisToken = tokens[i]

        // Incon does not  need to be downloaded, so continue with the next one
        if (thisToken.iconAlreadyDownloaded) continue

        // Try to get token icon url from mutable data.
        const { iconUrl, userData } = await fetchTokenMutableData(thisToken)
        console.log('iconUrl', iconUrl)
        if (iconUrl) {
          // Set the icon url to the token , this can be used to display the icon in the token card component.
          thisToken.icon = iconUrl
          thisToken.tokenData.userData = userData
        }

        // Mark token to prevent fetch token icon again.
        thisToken.iconAlreadyDownloaded = true
      }

      setIconsAreLoaded(true)
    } catch (error) {
      setIconsAreLoaded(true)
    }
  }, [fetchTokenMutableData])

  const loadData = useCallback(async () => {
    const tokens = appData.bchWalletState.slpTokens
    console.log('tokens', tokens)
    setTokens(tokens)
    await lazyLoadTokenData(tokens)
    await lazyLoadMutableData(tokens)
  }, [appData, lazyLoadTokenData, lazyLoadMutableData])

  // Start to load the token icons when the component is mounted
  useEffect(() => {
    if (slpInitLoaded) {
      loadData()
    }
  }, [loadData, slpInitLoaded])

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
              lazyLoadTokenIcons={loadData}
            />
          </Col>
          <Col xs={6} style={{ textAlign: 'right' }}>
            <a href='https://youtu.be/f1no5-QHTr4' target='_blank' rel='noreferrer'>
              <FontAwesomeIcon icon={faCircleQuestion} size='lg' />
            </a>
          </Col>
        </Row>
        <Row>
          {appData.asyncInitSucceeded && (
            <Col xs={12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/** Show spinner info if tokens are loaded but data is not loaded */
             !backgroundDataLoaded && !backgroundDataError && (
               <div style={{ borderRadius: '10px', backgroundColor: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 'fit-content' }}>
                 <span style={{ marginRight: '10px' }}>Loading Tokens </span>
                 <Spinner animation='border' />
               </div>
             )
           }
              {/** Show spinner info if tokens are loaded but data is not loaded */
             !backgroundDataError && !dataAreLoaded && tokens.length > 0 && (
               <div style={{ borderRadius: '10px', backgroundColor: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 'fit-content' }}>
                 <span style={{ marginRight: '10px' }}>Loading Token Data </span>
                 <Spinner animation='border' />
               </div>
             )
           }
              {/** Show spinner info if tokens are loaded but icons are not loaded */
             backgroundDataLoaded && dataAreLoaded && !iconsAreLoaded && (
               <div style={{ borderRadius: '10px', backgroundColor: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 'fit-content' }}>
                 <span style={{ marginRight: '10px' }}>Loading Token Icons </span>
                 <Spinner animation='border' />
               </div>
             )
           }

            </Col>
          )}
        </Row>
        <br />

        <Row>
          {generateCards()}
        </Row>
        {/** Display a message if no tokens are found */}
        {backgroundDataLoaded && !backgroundDataError && tokens.length === 0 && (
          <Row className='text-center'>
            <span> No tokens found in wallet </span>
          </Row>
        )}
        {backgroundDataError && (
          <Row style={{ color: 'red' }} className='text-center'>
            <span>Tokens could not be loaded! </span>
          </Row>
        )}

      </Container>
    </>
  )
}

export default SlpTokens
