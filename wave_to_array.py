# https://stackoverflow.com/a/19999599
import wave
import struct

def dataFromWave(fname):
    """ return list with interleaved samples """
    f = wave.open(fname, 'rb')
    chans = f.getnchannels()
    samps = f.getnframes()
    sampwidth = f.getsampwidth()
    if  sampwidth == 3: #have to read this one sample at a time
        s = ''
        for k in xrange(samps):
            fr = f.readframes(1)
            for c in xrange(0,3*chans,3):                
                s += '\0'+fr[c:(c+3)] # put TRAILING 0 to make 32-bit (file is little-endian)
    else:
        s = f.readframes(samps)
    f.close()
    unpstr = '<{0}{1}'.format(samps*chans, {1:'b',2:'h',3:'i',4:'i',8:'q'}[sampwidth])
    x = list(struct.unpack(unpstr, s))
    if sampwidth == 3:
        x = [k >> 8 for k in x] #downshift to get +/- 2^24 with sign extension
    return x

# this is a random piano chord sample I found online and cut down in length and compressed a bit
a = dataFromWave("piano_cutdown.wav")
# normalize between -1 and 1, use python3 - python2 will do int division
a = [round(i/max(a), 4) for i in a]
# 500 is completely arbitrary
print(a[0:500])