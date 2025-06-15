import { ref, onMounted } from 'vue'
import fs from 'fs'
import path from 'path'

export function useConfig() {
  const config = ref({
    openai_api_key: '',
    app_version: '1.0.0',
    flask_port: 5001,
    install_date: ''
  })

  const isLoading = ref(true)
  const error = ref(null)

  const loadConfig = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Electron 환경에서 실행파일 디렉토리 확인
      const configPaths = [
        path.join(process.cwd(), 'config.json'),
        path.join(__dirname, '..', '..', 'config.json'),
        path.join(process.resourcesPath, 'config.json'),
        // 개발 환경
        path.join(process.cwd(), '..', '..', 'config.json')
      ]

      let configData = null
      let configPath = null

      for (const configFilePath of configPaths) {
        try {
          if (await fs.promises.access(configFilePath, fs.constants.F_OK).then(() => true).catch(() => false)) {
            const data = await fs.promises.readFile(configFilePath, 'utf8')
            configData = JSON.parse(data)
            configPath = configFilePath
            console.log(`[useConfig] 설정 파일 로드됨: ${configFilePath}`)
            break
          }
        } catch (err) {
          console.warn(`[useConfig] 설정 파일 로드 실패: ${configFilePath}`, err)
        }
      }

      if (configData) {
        config.value = { ...config.value, ...configData }
      } else {
        console.warn('[useConfig] config.json 파일을 찾을 수 없습니다.')
      }

      // 환경 변수에서 API 키 확인
      const envApiKey = process.env.OPENAI_API_KEY
      if (envApiKey) {
        config.value.openai_api_key = envApiKey
        console.log('[useConfig] 환경 변수에서 OPENAI_API_KEY 로드됨')
      }

      // API 키 검증
      if (!isApiKeyValid(config.value.openai_api_key)) {
        console.error('❌ [useConfig] OpenAI API 키가 설정되지 않았거나 올바르지 않습니다!')
        error.value = 'OpenAI API 키가 올바르지 않습니다.'
      } else {
        console.log('✅ [useConfig] OpenAI API 키가 설정되었습니다.')
      }

    } catch (err) {
      console.error('[useConfig] 설정 로드 중 오류:', err)
      error.value = `설정 로드 실패: ${err.message}`
    } finally {
      isLoading.value = false
    }
  }

  const isApiKeyValid = (apiKey) => {
    return apiKey && apiKey.length > 20 && apiKey.startsWith('sk-')
  }

  const getFlaskUrl = () => {
    return `http://localhost:${config.value.flask_port}`
  }

  const createSampleConfig = async (filePath = 'config.json') => {
    try {
      const sampleConfig = {
        openai_api_key: 'your-api-key-here',
        app_version: '1.0.0',
        flask_port: 5001,
        install_date: new Date().toISOString().split('T')[0]
      }

      await fs.promises.writeFile(filePath, JSON.stringify(sampleConfig, null, 2), 'utf8')
      console.log(`[useConfig] 샘플 설정 파일 생성됨: ${filePath}`)
      return true
    } catch (err) {
      console.error('[useConfig] 샘플 설정 파일 생성 실패:', err)
      return false
    }
  }

  const reloadConfig = () => {
    loadConfig()
  }

  // 컴포넌트 마운트 시 설정 로드
  onMounted(() => {
    loadConfig()
  })

  return {
    config: config,
    isLoading,
    error,
    loadConfig,
    isApiKeyValid: () => isApiKeyValid(config.value.openai_api_key),
    getFlaskUrl,
    createSampleConfig,
    reloadConfig
  }
} 