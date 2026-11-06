import assert from 'node:assert/strict'
import {test} from 'node:test'
import {AuthApi} from '../src/features/auth/api.ts'
test('classified cardio GET is an explicit authenticated transport route; writes and query variants stay blocked',async()=>{let calls=0;const api=new AuthApi(async()=>{calls++;return new Response(JSON.stringify({activities:[]}),{headers:{'Content-Type':'application/json'}})});const signal=new AbortController().signal;await api.workoutRequest('/api/v1/cardio-activities','GET',undefined,signal);assert.equal(calls,1);await assert.rejects(api.workoutRequest('/api/v1/cardio-activities','POST',{},signal));await assert.rejects(api.workoutRequest('/api/v1/cardio-activities?owner=other','GET',undefined,signal));assert.equal(calls,1)})
