// RMS value taken from:
// https://en.wikipedia.org/wiki/Root_mean_square#In_common_waveforms
export let waveforms = {
    square: {
        equationName: 'square',
        function: square,
        rms: 1,
    },
    sin: {
        // we use cos, even though it's called sin
        // because equations tend to describe it in terms of cos
        equationName: 'cos',
        function: Math.cos,
        rms: 1/Math.sqrt(2),
    },
    triangle: {
        equationName: 'triangle',
        function: triangle,
        rms: 1/Math.sqrt(3),
    },
};

function square(radians) {
    if ((radians % (2 * Math.PI)) < Math.PI) {
        return -1;
    } else {
        return 1;
    }
}

//todo: why is this broken for first few cycles?
function triangle(radians) {
    let placeInCycle = radians % (Math.PI / 2);
    let percentOfCycle = placeInCycle / (Math.PI / 2);
    let cycle = radians % (2 * Math.PI);
    if (cycle < 0.5 * Math.PI) {
        return percentOfCycle;
    } else if (cycle < Math.PI) {
        return 1 - percentOfCycle;
    } else if (cycle < 1.5 * Math.PI) {
        return -percentOfCycle;
    } else {
        return -(1 - percentOfCycle);
    }
}
