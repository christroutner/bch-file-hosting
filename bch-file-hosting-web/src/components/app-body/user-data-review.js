/*
  Search in the provided cid of a mutable data, get the data from the user data and show it
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Row, Col, Spinner, Carousel } from 'react-bootstrap'
import ReactMarkdown from 'react-markdown'
import '../../App.css'

function UserDataReview (props) {
  const appData = props.appData
  const [media, setMedia] = useState([])
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tokenData, setTokenData] = useState(null)
  // Get the id parameter from the URL
  const { tokenId } = useParams()

  useEffect(() => {
    const loadData = async () => {
      try {
        const tokenData = await appData.wallet.getTokenData(tokenId)

        setTokenData(tokenData)
        setLoading(true)

        if (!tokenData.mutableData) throw new Error('Mutable data not found')

        const cid = parseCid(tokenData.mutableData)

        const { json } = await appData.wallet.cid2json({ cid })
        const userDataString = json.userData

        if (userDataString) {
          const userData = JSON.parse(userDataString)
          setMedia(userData.media)
          setMarkdown(userData.markdown)
        }
      } catch (error) {
        setError(error.message)
      }
      setLoading(false)
    }
    loadData()
  }, [tokenId, appData.wallet])

  // Get Cid from url
  const parseCid = (url) => {
    // get the cid from the url format 'ipfs://bafybeicem27xbzs65uvbcgykcmscsgln3lmhbfrcoec3gdttkdgtxv5acq
    if (url && url.includes('ipfs://')) {
      const cid = url.split('ipfs://')[1]
      return cid
    }
    return url
  }

  return (
    <Container>
      <Row>
        <Col>
          {/** Error message */}
          {error && <p className='text-danger'>{error}</p>}

          {/** Loading spinner */}
          {loading &&
            (
              <div className='text-center my-5'>
                <Spinner animation='border' role='status' variant='primary'>
                  <span className='visually-hidden'>Loading...</span>
                </Spinner>
              </div>
            )}
          {/** User data */}
          {!loading && !error && (
            <div className='text-center'>
              {/** Name */}
              <h1>{tokenData.genesisData.name}</h1>

              {/** Media  Content Carousel */}
              {media && media.length > 0
                ? (
                  <div className='my-5 '>
                    <Carousel>
                      {media.map((item, index) => (
                        <Carousel.Item key={index}>
                          <img
                            className='d-block w-100'
                            src={item.url}
                            alt={`Review media ${index + 1}`}
                            style={{ height: '400px', objectFit: 'contain' }}
                          />
                          <Carousel.Caption>
                            <p>Image {index + 1} of {media.length}</p>
                          </Carousel.Caption>
                        </Carousel.Item>
                      ))}
                    </Carousel>
                    <style>{'.carousel-control-next,.carousel-control-prev, .carousel-indicators {filter: invert(100%); } '}
                    </style>
                  </div>
                  )
                : (
                  <p className='mt-3'>No media content available</p>
                  )}

              {/** Markdown Content */}
              {markdown
                ? (
                  <div className='markdown-content my-5'>
                    <ReactMarkdown>{markdown}</ReactMarkdown>
                  </div>
                  )
                : (
                  <p className='mt-3'>No content available</p>
                  )}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default UserDataReview
