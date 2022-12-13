const superagent = require('superagent')
const bech32 = require('bech32-buffer')
const config = require('./config.json')
const { exec } = require('child_process')

interface ListValidatorsResp {
  total: number
  validators?: [
    {
      validator: string
      valName: string
      commissionRate: number
      votingPower: number
      status: number
      votingPowerProportion: number
      creationTime: number
      apr: number
      logoUrl: string
      delegatorNum?: number
    },
  ]
}

const init = () => {}

// get list of all the current validator
const getValidatorList = async () => {
  console.log('api binance validators?limit=100&offset=0 Called')

  let validators: ListValidatorsResp = { total: 0 }
  let countCastVote = 0
  let votingPowerCast = 0
  let countNonCastVote = 0
  let votingPowerNonCast = 0
  let validatorsNonCastList = []
  let validatorsCastList = []

  await (async () => {
    const response = await superagent.get(
      config.baseURL + config.listValidatorURL,
    )
    // console.log(response.body)
    validators = response.body
    console.log('Total number of validators: ' + validators.total)
  })()

  await new Promise(async (resolve, reject) => {
    for await (const iterator of validators.validators) {
      if (iterator.status == 0) {
        // console.log(iterator)
        const decodedAddress = bech32.decode(iterator.validator)
        // console.log(bech32.encode('bnb', decodedAddress.data))
        const bnbEncodedAddress = bech32.encode('bnb', decodedAddress.data)
        exec(
          './bnbcli gov  query-votes  --proposal-id 14 --side-chain-id  bsc   --trust-node  --node    http://dataseed2.defibit.io:80     --chain-id Binance-Chain-Tigris | grep ' +
            bnbEncodedAddress +
            ' | wc -l|xargs',
          (err, stdout: number, stderr) => {
            console.log(iterator.valName + ' voting status: ' + stdout)
            if (stdout == 0) {
              countNonCastVote += 1
              votingPowerNonCast += iterator.votingPowerProportion
              validatorsNonCastList.push(iterator.valName)
            } else {
              countCastVote += 1
              votingPowerCast += iterator.votingPowerProportion
              validatorsCastList.push(iterator.valName)
            }
            console.log(votingPowerCast + ' / ' + votingPowerNonCast)
            console.log(validatorsNonCastList)
            console.log(validatorsCastList)
          },
        )
      }
    }
  })
  console.log('3')
  return [countCastVote, votingPowerCast, countNonCastVote, votingPowerNonCast]
}

const main = async () => {
  init()
  console.log(await getValidatorList())
}

main()
