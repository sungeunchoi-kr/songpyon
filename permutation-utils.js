/**
 * e.g. [[1,2,3],[4,5]]  *  [[1,2]]
 */
function composeCycles(c1, c2, N) {
    let p1 = cycleToPermutation(c1)
    let p2 = cycleToPermutation(c2)

    let nKeys = []
    for (var i=1; i<=N; ++i)
        nKeys.push(i)

    let composition = {}
    nKeys.forEach(e => {
        if (p1[e] != null) {
            if (p2[ p1[e] ] != null) {
                composition[e] = p2[ p1[e] ]
            } else {
                composition[e] = p1[e]
            }
        } else {
            if (p2[e] != null) {
                composition[e] = p2[e]
            } else {
                composition[e] = e
            }
        }
    })

    return permutationToCycle(composition)
}
console.log('composeCycles([[1,2],[3,4]], [[1,2,3,4,5]], 5):')
console.log(composeCycles([[1,2],[3,4]], [[1,2,3,4,5]], 5))
console.log('composeCycles([[1,2,5]], [[1,2],[3,4]], 5)')
console.log(composeCycles([[1,2,5]], [[1,2],[3,4]], 5))

function printCycle(cycles) {
    let arr = cycles.map(cycle => {
        let s = '('
        cycle.forEach(c => s += c)
        s += ')'
        return s
    })

    let s = ''
    arr.forEach(a => {
        s += a
    })
    return s
}

function permutationToCycle(permutationMap_) {
    let permutationMap = JSON.parse(JSON.stringify(permutationMap_))

    let cycles = []
    let cycle = []

    let keys = Object.keys(permutationMap).map(v => parseInt(v))
    let n = keys.sort()[0]
    while (Object.keys(permutationMap).length > 0) {
        if (permutationMap[n] == null || permutationMap[n] == n) {
            delete permutationMap[n]
            keys = Object.keys(permutationMap).map(v => parseInt(v))
            n = keys.sort()[0]
            continue
        }

        if (cycle.includes(permutationMap[n])) {
            delete permutationMap[n]
            cycles.push(cycle)
            cycle = []
            keys = Object.keys(permutationMap).map(v => parseInt(v))
            n = keys.sort()[0]
            continue
        }

        if (cycle.length === 0) {
            cycle.push(parseInt(n))
        }
        cycle.push(permutationMap[n])

        let n_ = permutationMap[n]
        delete permutationMap[n]
        n = n_
    }

    if (cycles.length === 0) {
        cycles.push([])
    }
    return cycles
}
console.log(permutationToCycle({1:1,2:2,3:3,4:4}))
console.log(permutationToCycle({1:2,2:3,3:4,4:1}))
console.log(permutationToCycle({1:2,2:1,3:4,4:3}))

function cycleToPermutation(cycles_) {
    let cycles = JSON.parse(JSON.stringify(cycles_))

    let permutationMapping = {}
    cycles.forEach(cycle => {
        // cycle is for e.g. [3,4,5]
        cycle.push(cycle[0])
        for (let i=0; i<cycle.length-1; ++i) {
            permutationMapping[ cycle[i] ] = cycle[i+1]
        }
    })

    return permutationMapping
}
console.log(cycleToPermutation([[1,2,3],[4,5]]))

function inverseCycle(cycles, N) {
    let pmap = cycleToPermutation(cycles)
    
    let invpmap = {}
    for (n=1; n<=N; ++n) {
        Object.keys(pmap).forEach(key => {
            if (pmap[key] === n) {
                invpmap[n] = parseInt(key)
            }
        })

        if (invpmap[n] == null)
            invpmap[n] = n
    }

    let r = permutationToCycle(invpmap)
    return r
}

function calculateMover(cycleA, cycleB, N) {
    let inv = inverseCycle(cycleA, N)
    let e = composeCycles(inv, cycleB, N)
    return e
}

