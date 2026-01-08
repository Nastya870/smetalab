
import OpenAI from 'openai';
import 'dotenv/config';

console.log('🔑 Checking OpenAI API Key...');
// Mask the key for logging
const key = process.env.OPENAI_API_KEY;
console.log(`Key: ${key ? key.substring(0, 10) + '...' + key.substring(key.length - 5) : 'MISSING'}`);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testGPT() {
    try {
        console.log('🚀 Sending request to OpenAI (gpt-4o-mini)...');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say "OpenAI is working!"' }
            ],
            max_tokens: 50
        });

        console.log('✅ Response:', response.choices[0].message.content);
    } catch (error) {
        console.error('❌ OpenAI Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testGPT();
