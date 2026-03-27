
import { fixDashedFlagValue } from '../src/command'

const argv = ['-o', 'costa-coffee-demo', '-i', '-CLIENT_ID_HERE', '-S', 'market:15769', '-a', 'costa-south']

// const clientId = 'CLIENT_ID_HERE'

const flag = {
	name: 'clientId',
	char: 'i'
}

const parsed = {
	argv: [],
	flags: {
	  organization: 'costa-coffee-demo',
	  clientId: '____-CLIENT_ID_HERE',
	  scope: [ 'market:15769' ],
	  alias: 'costa-south'
	},
	args: {},
	raw: [
	  { type: 'flag', flag: 'organization', input: 'costa-coffee-demo' },
	  {
		type: 'flag',
		flag: 'clientId',
		input: '____-CLIENT_ID_HERE'
	  },
	  { type: 'flag', flag: 'scope', input: 'market:15769' },
	  { type: 'flag', flag: 'alias', input: 'costa-south' }
	],
	metadata: { flags: { debug: {}, provisioning: {} } },
	nonExistentFlags: []
  }


console.log(argv)
fixDashedFlagValue(argv, flag)
console.log(argv)
fixDashedFlagValue(argv, flag, undefined, parsed)
console.log(argv)
console.log(parsed)
