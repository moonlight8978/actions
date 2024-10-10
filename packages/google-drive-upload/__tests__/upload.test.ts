import { upload } from '../src/main'

describe('upload', () => {
  it('upload to google drive', async () => {
    const serviceAccountFile = process.env.SERVICE_ACCOUNT_BASE_64 as string
    const remoteFolderId = process.env.FOLDER_ID as string

    const { id, folderId, size } = await upload(
      remoteFolderId,
      'Test.csv',
      'GoogleDriveUpload2/Test.txt',
      serviceAccountFile
    )

    expect(id).not.toBeNull()
    expect(folderId).not.toBeNull()
    expect(size).toBeGreaterThan(0)
  })
})
