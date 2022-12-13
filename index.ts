const superagent = require('superagent')
const bech32 = require('bech32-buffer')
const config = require('./config.json')
const {execSync} = require('child_process')

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

const init = () => {
}

// get list of all the current validator
const getValidatorList = async () => {
    console.log('api binance validators?limit=100&offset=0 Called')

    let validators: ListValidatorsResp = {total: 0}
    let countCastVoteYes = 0
    let votingPowerCastYes = 0
    let countCastVoteNo = 0
    let votingPowerCastNo = 0
    let votingPowerNonCast = 0
    let validatorsNonCastList = []
    let validatorsCastListYes = []
    let validatorsCastListNo = []

    await (async () => {
        const response = await superagent.get(
            config.baseURL + config.listValidatorURL,
        )
        // console.log(response.body)
        validators = response.body
        console.log('Total number of validators: ' + validators.total)
    })()

    let voteResult: any = {}
    await new Promise(async (resolve, reject) => {

        const result = execSync('./bnbcli gov  query-votes  --proposal-id 14 --side-chain-id  bsc   --trust-node  --node http://dataseed2.defibit.io:80 --chain-id Binance-Chain-Tigris')
        let resultObj = JSON.parse(result.toString())

        for (const iterator of validators.validators) {
            if (iterator.status !== 0) continue;

            const decodedAddress = bech32.decode(iterator.validator)
            const bnbEncodedAddress = bech32.encode('bnb', decodedAddress.data)

            if (resultObj && resultObj.length) {
                for (let i = 0; i < resultObj.length; i++) {
                    const {voter, option} = resultObj[i]
                    voteResult[voter] = option
                    if (voter == bnbEncodedAddress) {
                        resultObj[i].name = iterator.valName
                    }
                }
            }

            // non vote
            if (!voteResult[bnbEncodedAddress]) {
                votingPowerNonCast += iterator.votingPowerProportion
                validatorsNonCastList.push(iterator.valName)
            } else if (voteResult[bnbEncodedAddress].toLowerCase() === 'yes') {
                countCastVoteYes++;
                votingPowerCastYes += iterator.votingPowerProportion
                validatorsCastListYes.push(iterator.valName)
            } else {
                countCastVoteNo++;
                votingPowerCastNo += iterator.votingPowerProportion
                validatorsCastListNo.push(iterator.valName)
            }
        }

        console.log('---------------------------------------------')
        console.log('original vote result: ', resultObj)
        console.log('---------------------------------------------')
        console.log('1. validators casted Yes: ', validatorsCastListYes)
        console.log('---------------------------------------------')
        console.log('2. validators casted No: ', validatorsCastListNo)
        console.log('---------------------------------------------')
        console.log('3. validators Non Cast: ', validatorsNonCastList)
        console.log('---------------------------------------------')

        console.log(`${votingPowerCastYes.toFixed(4)} casted Yes && ${votingPowerCastNo.toFixed(4)} casted No / ${votingPowerNonCast.toFixed(4)} non casted`)
    })
}

const main = async () => {
    init()
    console.log(await getValidatorList())
}

main()
